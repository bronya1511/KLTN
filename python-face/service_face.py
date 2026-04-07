# service_face.py
# Flask API nhan dien khuon mat: /api/face/recognize

import os, time, threading
from functools import wraps
from flask import Flask, jsonify, request, Response, stream_with_context
import numpy as np
import cv2

from detect_face_ncnn import crop_face_bgr
from mobilefacenet_onnx import MobileFaceNet, l2norm

try:
    from picamera2 import Picamera2
except ImportError:
    Picamera2 = None

# ===== config =====
BASE_DIR   = os.path.dirname(__file__)
MODEL_PATH = os.environ.get("MBF_MODEL", os.path.join(BASE_DIR, "models", "mobilefacenet.onnx"))
INDEX_PATH = os.environ.get("INDEX_PATH", os.path.join(BASE_DIR, "models", "encodings.npz"))
SCORE_TH   = float(os.environ.get("SCORE_TH", "0.45"))   # nguong cos (0..1); < nguong -> Unknown
API_TOKEN  = os.environ.get("SERVICE_API_TOKEN", "")
DET_SCORE_TH = float(os.environ.get("DET_SCORE_TH", "1.6"))
SERVICE_FLIP_AUG = os.environ.get("SERVICE_FLIP_AUG", "0") not in ("0", "false", "False")
MAX_UPLOAD_MB = float(os.environ.get("MAX_UPLOAD_MB", "5"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)
STREAM_ENABLED = os.environ.get("STREAM_ENABLED", "1") not in ("0", "false", "False")
STREAM_USE_OPENCV = os.environ.get("STREAM_USE_OPENCV", "1") in ("1", "true", "True")  # mặc định ưu tiên OpenCV/USB cam
STREAM_CAMERA_INDEX = int(os.environ.get("STREAM_CAMERA_INDEX", "0"))
STREAM_FRAME_WIDTH = int(os.environ.get("STREAM_FRAME_WIDTH", "640"))
STREAM_FRAME_HEIGHT = int(os.environ.get("STREAM_FRAME_HEIGHT", "480"))
# Giảm thêm độ phân giải khi gặp lỗi "Failed to allocate required memory" (CMA/GStreamer).
# Nếu vẫn lỗi, đặt STREAM_FRAME_WIDTH/HEIGHT thấp hơn qua env, ví dụ 320x240.

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

mbf = None
db_labels = None
db_embs   = None
_preview_cam = None

def preview_camera():
  global _preview_cam
  if _preview_cam is None:
    _preview_cam = PreviewCamera()
  return _preview_cam


def capture_single_frame():
    """Mo camera tam thoi (OpenCV hoac PiCamera2), chup 1 frame JPEG."""
    frame = None
    cam = None
    cap = None
    try:
        if STREAM_USE_OPENCV or Picamera2 is None:
            cap = cv2.VideoCapture(STREAM_CAMERA_INDEX, cv2.CAP_V4L2)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, STREAM_FRAME_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, STREAM_FRAME_HEIGHT)
            ok, frm = cap.read()
            if ok:
                frame = frm
        else:
            cams = Picamera2.global_camera_info()
            if not cams:
                raise RuntimeError("Khong tim thay camera Raspberry Pi")
            if STREAM_CAMERA_INDEX >= len(cams):
                raise RuntimeError(f"Chi so camera {STREAM_CAMERA_INDEX} khong hop le")
            cam = Picamera2(camera_num=STREAM_CAMERA_INDEX)
            cfg = cam.create_still_configuration(
                main={"format": "XRGB8888", "size": (STREAM_FRAME_WIDTH, STREAM_FRAME_HEIGHT)}
            )
            cam.configure(cfg)
            cam.start()
            frm = cam.capture_array()
            if frm is not None:
                if frm.shape[-1] == 4:
                    frm = frm[..., :3]
                frame = cv2.cvtColor(frm, cv2.COLOR_RGB2BGR)
    finally:
        if cam:
            try:
                cam.stop()
            except Exception:
                pass
        if cap:
            try:
                cap.release()
            except Exception:
                pass
    if frame is None:
        return None
    ok, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes() if ok else None


class PreviewCamera:
    def __init__(self):
        self.lock = threading.Lock()
        self.frame = None
        self.running = False
        self.thread = None
        self.use_opencv = STREAM_USE_OPENCV or Picamera2 is None
        self.cap = None
        self.picam2 = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)
        if self.picam2:
            try:
                self.picam2.stop()
            except Exception:
                pass
            self.picam2 = None
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def _init_camera(self):
        if self.use_opencv:
            source = STREAM_CAMERA_INDEX
            self.cap = cv2.VideoCapture(source, cv2.CAP_V4L2)
            # Thử độ phân giải thấp trước để tránh lỗi bộ nhớ
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, STREAM_FRAME_WIDTH)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, STREAM_FRAME_HEIGHT)
            if not self.cap.isOpened():
                raise RuntimeError("Khong mo duoc webcam/OpenCV source")
        else:
            if Picamera2 is None:
                raise RuntimeError("Picamera2 khong kha dung")
            cams = Picamera2.global_camera_info()
            if not cams:
                raise RuntimeError("Khong tim thay camera Raspberry Pi nao")
            if STREAM_CAMERA_INDEX >= len(cams):
                raise RuntimeError(f"Chi so camera {STREAM_CAMERA_INDEX} khong hop le")
            self.picam2 = Picamera2(camera_num=STREAM_CAMERA_INDEX)
            config = self.picam2.create_preview_configuration(
                main={"format": "XRGB8888", "size": (STREAM_FRAME_WIDTH, STREAM_FRAME_HEIGHT)}
            )
            self.picam2.configure(config)
            self.picam2.start()

    def _loop(self):
        try:
            self._init_camera()
        except Exception as exc:
            app.logger.error(f"[stream] {exc}")
            self.running = False
            return

        while self.running:
            frame = None
            if self.cap is not None:
                ret, frm = self.cap.read()
                if ret:
                    frame = frm
            elif self.picam2 is not None:
                try:
                    frm = self.picam2.capture_array()
                    if frm is not None:
                        if frm.shape[-1] == 4:
                            frm = frm[..., :3]
                        frame = cv2.cvtColor(frm, cv2.COLOR_RGB2BGR)
                except Exception:
                    frame = None

            if frame is not None:
                with self.lock:
                    self.frame = frame
            time.sleep(0.03)

    def get_jpeg(self):
        if not self.running:
            self.start()
        with self.lock:
            if self.frame is None:
                return None
            frame = self.frame.copy()
        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            return None
        return buf.tobytes()

def require_api_key(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if API_TOKEN and request.headers.get("X-API-Key") != API_TOKEN:
            return jsonify(ok=False, error="unauthorized"), 401
        return func(*args, **kwargs)
    return wrapper

def load_all():
    global mbf, db_labels, db_embs
    mbf = MobileFaceNet(MODEL_PATH, flip_aug=SERVICE_FLIP_AUG)
    if not os.path.isfile(INDEX_PATH):
        raise FileNotFoundError(f"Missing index: {INDEX_PATH}, hay chay build_index_mbf.py truoc")
    data = np.load(INDEX_PATH, allow_pickle=False)
    db_labels = np.asarray(data["labels"]).astype(str).tolist()
    db_embs   = data["embs"].astype(np.float32)
    if db_embs.ndim != 2:
        raise ValueError(f"Invalid embedding matrix shape: {db_embs.shape}")
    # db_embs da L2; nhung van dam bao
    db_embs[:] = l2norm(db_embs)
    app.logger.info(f"Loaded index: labels={len(db_labels)} dim={db_embs.shape[1]}")

def _imread_from_request():
    if "file" not in request.files:
        return None, "missing file"
    f = request.files["file"]
    if f.mimetype and not f.mimetype.startswith("image/"):
        return None, "invalid content type"
    data = f.read()
    if not data:
        return None, "empty file"
    if len(data) > MAX_UPLOAD_BYTES:
        return None, "file too large"
    buf = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        return None, "decode failure"
    return img, None

@app.get("/api/face/health")
def health():
    return jsonify(ok=True, ts=time.time(), labels=len(db_labels or []))

@app.post("/api/face/reload")
@require_api_key
def reload_idx():
    load_all()
    return jsonify(ok=True, reloaded=True)

@app.post("/api/face/recognize")
@require_api_key
def recognize():
    img, err = _imread_from_request()
    if err:
        return jsonify(ok=False, error=err), 400

    det_kwargs = {}
    if DET_SCORE_TH >= 0:
        det_kwargs["score_th"] = DET_SCORE_TH
    face, box = crop_face_bgr(img, expand=0.20, **det_kwargs)
    if face is None:
        return jsonify(ok=True, faces=[])

    q = mbf.embed_bgr(face, flip_aug=SERVICE_FLIP_AUG).astype(np.float32)               # (D,)
    # cosine: q . db
    sim = (db_embs @ q)                                      # (N,)
    idx = int(np.argmax(sim))
    score = float(sim[idx])
    name  = db_labels[idx] if score >= SCORE_TH else "Unknown"
    x,y,w,h = box

    return jsonify(ok=True, faces=[{
        "name": name, "score": round(score, 4),
        "box": {"x":int(x),"y":int(y),"w":int(w),"h":int(h)}
    }])

@app.route("/api/face/stream", methods=["GET", "HEAD"])
def stream():
    if not STREAM_ENABLED:
        return jsonify(ok=False, error="stream disabled"), 503

    # HEAD -> chi tra ve 200 de kiem tra nhanh
    if request.method == "HEAD":
        return ("", 200, {"Content-Type": "multipart/x-mixed-replace; boundary=frame"})

    cam = preview_camera()

    def generate():
        while True:
            frame = cam.get_jpeg()
            if frame is None:
                time.sleep(0.1)
                continue
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")

    return Response(stream_with_context(generate()),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/face/snapshot")
def snapshot():
    frame = capture_single_frame()
    if frame is None:
        return jsonify(ok=False, error="Khong chup duoc frame (camera ban hoac khong kha dung)"), 503
    return Response(frame, mimetype="image/jpeg")

if __name__ == "__main__":
    port = int(os.environ.get("SERVICE_PORT", "5002"))
    load_all()
    app.run(host="0.0.0.0", port=port)
