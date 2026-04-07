#!/usr/bin/env python3
# detect_preview.py
# Xem khung phat hien mat (YOLO NCNN) voi Picamera2 hoac OpenCV GStreamer
# Ghi chu khong dau

import argparse
import time
import cv2
import numpy as np

from detect_face_ncnn import detect_boxes

# ---- helper ve ----
def draw_box(img, box, color=(0, 255, 0), thick=2):
    x, y, w, h = [int(round(v)) for v in box]
    cv2.rectangle(img, (x, y), (x + w, y + h), color, thick)

# ---- nguon camera ----
def open_picam(width, height):
    try:
        from picamera2 import Picamera2
    except Exception as e:
        print("WARN: picamera2 chua san co hoac loi import:", e)
        return None
    cam = Picamera2()
    cfg = cam.create_preview_configuration(main={"size": (width, height), "format": "BGR888"})
    cam.configure(cfg)
    cam.start()
    return cam

def read_picam(cam):
    try:
        return cam.capture_array()
    except Exception:
        return None

def open_gst(width, height, fps=30):
    pipe = (
        f"libcamerasrc ! video/x-raw,width={width},height={height},framerate={fps}/1,format=RGB ! "
        f"videoconvert ! video/x-raw,format=BGR ! appsink"
    )
    cap = cv2.VideoCapture(pipe, cv2.CAP_GSTREAMER)
    if not cap.isOpened():
        return None
    return cap

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=480)
    ap.add_argument("--source", choices=["picam", "gst", "v4l2"], default="picam",
                    help="picam=Picamera2, gst=OpenCV GStreamer libcamerasrc, v4l2=/dev/video0")
    ap.add_argument("--conf-thresh", type=float, default=0.45, help="nguong confidence YOLO (mac dinh 0.45)")
    args = ap.parse_args()

    cam = None
    cap = None

    if args.source == "picam":
        cam = open_picam(args.width, args.height)
        if cam is None:
            print("FALLBACK -> thu GStreamer")
            cap = open_gst(args.width, args.height)
    elif args.source == "gst":
        cap = open_gst(args.width, args.height)
    else:
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)

    if cam is None and (cap is None or not cap.isOpened()):
        print("ERR: khong mo duoc camera voi source =", args.source)
        return

    t0 = time.time()
    cnt = 0

    while True:
        if cam is not None:
            frame = read_picam(cam)
            if frame is None:
                continue
        else:
            ok, frame = cap.read()
            if not ok:
                continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        boxes = detect_boxes(
            frame,  # YOLO NCNN nhan anh BGR truc tiep
            conf_thresh=args.conf_thresh,
        )
        for b in boxes:
            draw_box(frame, b, (0, 255, 0), 2)

        cnt += 1
        now = time.time()
        if now - t0 >= 1.0:
            fps = cnt / (now - t0)
            t0 = now
            cnt = 0
            cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2, cv2.LINE_AA)

        cv2.imshow("detect preview", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    if cam is not None:
        try:
            cam.stop()
        except Exception:
            pass
    if cap is not None:
        cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
