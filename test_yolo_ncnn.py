import cv2
import ncnn
import numpy as np

def detect_faces(img_bgr, model_param, model_bin, conf_thresh=0.45, iou_thresh=0.45):
    net = ncnn.Net()
    net.load_param(model_param)
    net.load_model(model_bin)
    
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
    
    # Clip coordinates to original image bounds
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
            results.append((int(x1[i]), int(y1[i]), int(x2[i]-x1[i]), int(y2[i]-y1[i])))
            
    return results

if __name__ == "__main__":
    img = cv2.imread("1.png")
    if img is not None:
        res = detect_faces(img, "best_ncnn_model/model.ncnn.param", "best_ncnn_model/model.ncnn.bin")
        print(f"Found faces in 1.png: {res}")
    else:
        print("Failed to read 1.png")
