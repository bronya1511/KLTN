#!/usr/bin/python3
"""Nhan dien khuon mat + goi API diem danh"""

import argparse
import os
import time
from pathlib import Path

import cv2
import numpy as np
import face_recognition
import pickle
import requests
from detect_face_ncnn import detect_boxes

try:
    from picamera2 import Picamera2
except ImportError:
    Picamera2 = None

BASE_DIR = Path(__file__).resolve().parent
ENCODINGS_PATH = BASE_DIR / "encodings.pickle"
DEFAULT_BACKEND = os.environ.get("BACKEND_API_BASE", "http://127.0.0.1:8080/api")
DEFAULT_CLASS = os.environ.get("FACE_CLASS_CODE")
DEFAULT_MODE = os.environ.get("FACE_MODE", "checkin")
DEFAULT_COOLDOWN = int(os.environ.get("FACE_REPORT_COOLDOWN", "60") or 60)
API_TOKEN = os.environ.get("FACE_API_TOKEN")
SNAPSHOT_PATH = Path(os.environ.get("SNAPSHOT_PATH", Path(__file__).resolve().parent / "out" / "snapshot.jpg"))
TOLERANCE = float(os.environ.get("FACE_TOLERANCE", "0.55"))

parser = argparse.ArgumentParser(description="Nhan dien khuon mat & diem danh tu dong")
parser.add_argument("--backend", dest="backend", default=DEFAULT_BACKEND,
                    help="URL backend (mac dinh: %(default)s)")
parser.add_argument("--class-code", dest="class_code", default=DEFAULT_CLASS,
                    help="Ma lop mac dinh (co the bo trong de backend tu chon)")
parser.add_argument("--mode", choices=["checkin", "checkout"], default=DEFAULT_MODE,
                    help="Kieu diem danh (mac dinh: %(default)s)")
parser.add_argument("--cooldown", type=int, default=DEFAULT_COOLDOWN,
                    help="So giay chong spam cho moi MSSV")
parser.add_argument("--camera-index", type=int, default=0,
                    help="Chi so camera khi dung Picamera2 (mac dinh 0)")
parser.add_argument("--use-opencv", action="store_true",
                    help="Buoc dung cv2.VideoCapture thay vi Picamera2")
parser.add_argument("--video-source",
                    help="Duong dan video hoac device index cho OpenCV (vd: 0,1,'/dev/video0')")
parser.add_argument("--width", type=int, default=640, help="Frame width (OpenCV)")
parser.add_argument("--height", type=int, default=480, help="Frame height (OpenCV)")
parser.add_argument("--tolerance", type=float, default=TOLERANCE,
                    help="Nguong so khop khuon mat (mac dinh: %(default)s, nho hon -> khat khe hon)")
args = parser.parse_args()

API_BASE = (args.backend or DEFAULT_BACKEND).rstrip("/") or DEFAULT_BACKEND
ENDPOINT = f"{API_BASE}/diem-danh/{'checkout' if args.mode == 'checkout' else 'checkin'}"
HEADERS = {"Content-Type": "application/json"}
if API_TOKEN:
    HEADERS["Authorization"] = f"Bearer {API_TOKEN}"
TOLERANCE = args.tolerance

print("[INFO] Dang load du lieu khuon mat da train ...")
with open(ENCODINGS_PATH, "rb") as f:
    data = pickle.loads(f.read())

last_sent = {}
SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)


def report_attendance(name):
    if name == "Unknown" or not name:
        return
    now = time.time()
    if now - last_sent.get(name, 0) < max(5, args.cooldown):
        return

    payload = {"mssv": name}
    if args.class_code:
        payload["ma_lop"] = args.class_code

    try:
        resp = requests.post(ENDPOINT, json=payload, headers=HEADERS, timeout=5)
        resp.raise_for_status()
        print(f"[INFO] Gui diem danh {payload} -> {resp.json()}")
        last_sent[name] = now
    except Exception as exc:
        print(f"[WARN] Khong gui duoc diem danh cho {name}: {exc}")


def open_picamera():
    if Picamera2 is None:
        raise RuntimeError("Picamera2 khong kha dung (chua cai dat hoac khong chay tren Raspberry Pi).")
    cams = Picamera2.global_camera_info()
    if not cams:
        raise RuntimeError("Khong tim thay camera Raspberry Pi nao. Hay kiem tra ket noi hoac dung --use-opencv.")
    if args.camera_index >= len(cams):
        raise RuntimeError(f"Chi so camera {args.camera_index} khong hop le. He thong chi co {len(cams)} camera.")
    cam = Picamera2(camera_num=args.camera_index)
    config = cam.create_preview_configuration(main={"format": "XRGB8888", "size": (640, 480)})
    cam.configure(config)
    cam.start()
    return cam


def open_opencv():
    source = args.video_source
    if source is None:
        source = args.camera_index if args.camera_index is not None else 0
    elif source.isdigit():
        source = int(source)
    cap = cv2.VideoCapture(source, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    if not cap.isOpened():
        # fallback không V4L2 và giảm size
        cap.release()
        cap = cv2.VideoCapture(source)
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, min(args.width, 320))
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, min(args.height, 240))
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    if not cap.isOpened():
        raise RuntimeError(f"Khong mo duoc video source {source}")
    return cap


use_opencv = args.use_opencv or Picamera2 is None
camera = None
cap = None

try:
    if use_opencv:
        cap = open_opencv()
        print(f"[INFO] Dang su dung OpenCV VideoCapture (source={args.video_source or args.camera_index or 0}, size={args.width}x{args.height}).")
        # warm-up vài frame để tránh ret False
        warm_ok = False
        for _ in range(10):
            ret, frm = cap.read()
            if ret and frm is not None:
                warm_ok = True
                break
            time.sleep(0.05)
        if not warm_ok:
            # thử fallback thêm một lần nữa với non-V4L2 và size thấp
            try:
                cap.release()
                cap = cv2.VideoCapture(args.video_source if args.video_source else (args.camera_index if args.camera_index is not None else 0))
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, min(args.width, 320))
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, min(args.height, 240))
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                for _ in range(10):
                    ret, frm = cap.read()
                    if ret and frm is not None:
                        warm_ok = True
                        break
                    time.sleep(0.05)
            except Exception:
                pass
            if not warm_ok:
                raise RuntimeError("OpenCV mo duoc camera nhung khong nhan frame (ret=False). Thu giam resolution hoac doi cameraIndex.")
    else:
        camera = open_picamera()
        print("[INFO] Dang su dung Picamera2.")
except Exception as exc:
    print(f"[ERR] {exc}")
    if not use_opencv:
        try:
            print("[INFO] Thu fallback sang OpenCV VideoCapture...")
            cap = open_opencv()
            use_opencv = True
            print("[INFO] Dang su dung OpenCV VideoCapture.")
        except Exception as exc2:
            print(f"[ERR] {exc2}")
            print("[Goi y] Dung --use-opencv neu ban muon chay bang webcam USB hoac file video.")
            raise
    else:
        print("[Goi y] Dung --use-opencv neu ban muon chay bang webcam USB hoac file video.")
        raise

def read_frame():
    if camera is not None:
        return True, camera.capture_array()
    ret, frame = cap.read()
    if not ret or frame is None:
        # thử đọc lại thêm vài lần nếu fail
        for _ in range(3):
            ret, frame = cap.read()
            if ret and frame is not None:
                break
    return ret, frame

while True:
    ret, frame = read_frame()
    if not ret or frame is None:
        print("[WARN] Khong nhan duoc frame tu camera. Thu doc tiep...")
        time.sleep(0.05)
        continue
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    ncnn_boxes = detect_boxes(rgb, conf_thresh=0.45)
    # face_recognition expects (top, right, bottom, left)
    boxes = [(y, x + w, y + h, x) for x, y, w, h in ncnn_boxes]
    encodings = face_recognition.face_encodings(rgb, boxes)

    names = []
    for encoding in encodings:
        # dùng khoảng cách + ngưỡng thay vì chỉ vote để giảm nhầm lẫn
        distances = face_recognition.face_distance(data["encodings"], encoding)
        if isinstance(distances, list) and len(distances) == 0:
            names.append("Unknown")
            continue
        best_idx = int(np.argmin(distances))
        best_distance = distances[best_idx]
        if best_distance <= TOLERANCE:
            name = data["names"][best_idx]
        else:
            name = "Unknown"
        names.append(name)

    for ((top, right, bottom, left), name) in zip(boxes, names):
        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
        cv2.putText(frame, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2)
        report_attendance(name)

    try:
        cv2.imwrite(str(SNAPSHOT_PATH), frame)
    except Exception as exc:
        print(f"[WARN] Khong ghi duoc snapshot: {exc}")

    cv2.imshow("Nhan dien khuon mat", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cv2.destroyAllWindows()
if camera:
    camera.stop()
if cap:
    cap.release()
