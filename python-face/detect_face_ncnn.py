import os
import cv2
import ncnn
import numpy as np

# Path to the NCNN models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PARAM = os.environ.get("NCNN_FACE_PARAM", os.path.join(BASE_DIR, "best_ncnn_model/model.ncnn.param"))
MODEL_BIN   = os.environ.get("NCNN_FACE_BIN", os.path.join(BASE_DIR, "best_ncnn_model/model.ncnn.bin"))

_net = None

def get_net():
    global _net
    if _net is None:
        _net = ncnn.Net()
        # Ensure we have the model files
        if not os.path.exists(MODEL_PARAM) or not os.path.exists(MODEL_BIN):
            raise FileNotFoundError(f"Missing NCNN model files: {MODEL_PARAM} or {MODEL_BIN}")
        _net.load_param(MODEL_PARAM)
        _net.load_model(MODEL_BIN)
    return _net

def detect_boxes(
    gray_or_bgr: np.ndarray,
    conf_thresh: float = 0.45,
    iou_thresh: float = 0.45,
    **kw
) -> list[tuple[int, int, int, int]]:
    """
    Phat hien khuon mat tren anh bang YOLOv8 NCNN.
    Tra ve list (x, y, w, h).
    """
    net = get_net()
    
    # Neu la anh gray thi chuyen sang bgr de ncnn chay dung (model train bgr/rgb)
    if len(gray_or_bgr.shape) == 2:
        img_bgr = cv2.cvtColor(gray_or_bgr, cv2.COLOR_GRAY2BGR)
    else:
        img_bgr = gray_or_bgr.copy()
        
    img_h, img_w = img_bgr.shape[:2]
    target_w, target_h = 640, 640
    
    scale = min(target_w / img_w, target_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    
    resized = cv2.resize(img_bgr, (new_w, new_h))
    
    top = (target_h - new_h) // 2
    bottom = target_h - new_h - top
    left = (target_w - new_w) // 2
    right = target_w - new_w - left
    
    img_pad = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
    img_pad = cv2.cvtColor(img_pad, cv2.COLOR_BGR2RGB)
    
    img_pad = img_pad.astype(np.float32) / 255.0
    img_pad = np.ascontiguousarray(img_pad.transpose(2, 0, 1))

    # Provide clone() to avoid segfaults!
    mat_in = ncnn.Mat(img_pad).clone()
    
    ex = net.create_extractor()
    ex.input("in0", mat_in)
    _, out0 = ex.extract("out0")
    
    out_np = np.array(out0)
    
    if len(out_np.shape) == 0:
        return []

    if len(out_np.shape) == 2 and out_np.shape[0] == 5:
        out_np = out_np.T
        
    boxes = out_np[:, :4]
    scores = out_np[:, 4]
    
    # Optional override from kwargs mapping
    if "score_th" in kw and kw["score_th"] is not None:
        # Detect_face_haar.py used score_th
        conf_thresh = kw["score_th"]
        # If it was 1.6 in haar, force a normal YOLO value if out of bounds
        if conf_thresh > 1.0:
            conf_thresh = 0.45
            
    valid_idx = scores > conf_thresh
    valid_boxes = boxes[valid_idx]
    valid_scores = scores[valid_idx]
    
    if len(valid_boxes) == 0:
        return []
        
    x1 = valid_boxes[:, 0] - valid_boxes[:, 2] / 2
    y1 = valid_boxes[:, 1] - valid_boxes[:, 3] / 2
    x2 = valid_boxes[:, 0] + valid_boxes[:, 2] / 2
    y2 = valid_boxes[:, 1] + valid_boxes[:, 3] / 2
    
    x1 = (x1 - left) / scale
    y1 = (y1 - top) / scale
    x2 = (x2 - left) / scale
    y2 = (y2 - top) / scale
    
    x1 = np.clip(x1, 0, img_w - 1)
    y1 = np.clip(y1, 0, img_h - 1)
    x2 = np.clip(x2, 0, img_w - 1)
    y2 = np.clip(y2, 0, img_h - 1)
    
    indices = cv2.dnn.NMSBoxes(
        bboxes=[[int(b[0]), int(b[1]), int(b[2]-b[0]), int(b[3]-b[1])] for b in zip(x1, y1, x2, y2)],
        scores=valid_scores.tolist(),
        score_threshold=conf_thresh,
        nms_threshold=iou_thresh
    )
    
    results = []
    if len(indices) > 0:
        for i in indices.flatten():
            w = int(x2[i]-x1[i])
            h = int(y2[i]-y1[i])
            if w > 0 and h > 0:
                results.append((int(x1[i]), int(y1[i]), w, h))
            
    return results

def expand_to_square(xywh, img_w, img_h, margin=0.35):
    """
    Mo rong box ve hinh vuong, them le margin (ti le).
    Day box xuong duoi chut de om ca cam.
    Clamp trong khung anh.
    """
    x, y, w, h = map(float, xywh)
    s = max(w, h)
    cx = x + w / 2.0
    cy = y + h / 2.0

    s = s * (1.0 + margin)   # tang kich thuoc
    cy = cy + 0.08 * s       # day xuong de gom cam

    x = cx - s / 2.0
    y = cy - s / 2.0

    # clamp
    x = max(0, min(x, img_w - s))
    y = max(0, min(y, img_h - s))
    s = min(s, img_w - x, img_h - y)

    return tuple(map(int, (x, y, s, s)))

_last_box = None
ALPHA = 0.6

def reset_smooth_box():
    global _last_box
    _last_box = None

def smooth_box(box):
    global _last_box
    if _last_box is None:
        _last_box = np.array(box, dtype=float)
    else:
        _last_box = ALPHA * np.array(box, dtype=float) + (1.0 - ALPHA) * _last_box
    return tuple(map(int, _last_box))

def crop_face_bgr(
    img_bgr: np.ndarray,
    box: tuple[int, int, int, int] | None = None,
    margin: float = 0.35,
    expand: float | None = None,
    out_size: int = 112,
    smooth: bool = False,
    **kw,
):
    """
    Cat khuon mat tu anh BGR (Tuong thich voi phien ban cu)
    """
    H, W = img_bgr.shape[:2]

    if box is None:
        boxes = detect_boxes(img_bgr, **kw)
        if not boxes:
            return None, None
        box = max(boxes, key=lambda b: b[2] * b[3])

    eff_margin = margin if expand is None else expand
    bx = expand_to_square(box, W, H, margin=eff_margin)
    if smooth:
        bx = smooth_box(bx)

    x, y, s, _ = bx
    face = img_bgr[y : y + s, x : x + s].copy()
    if face.size == 0:
        return None, None

    face = cv2.resize(face, (out_size, out_size), interpolation=cv2.INTER_LINEAR)
    return face, bx
