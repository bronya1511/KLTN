# live_recognize_picam.py
# Ghi chu: khong dau
# Su dung YOLOv8 NCNN de phat hien khuon mat

import os
import time
from collections import deque
from pathlib import Path

import cv2
import numpy as np

from mobilefacenet_onnx import MobileFaceNet, l2norm  # type: ignore
from detect_face_ncnn import detect_boxes, crop_face_bgr, reset_smooth_box  # type: ignore

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "mobilefacenet.onnx")
INDEX_PATH = os.path.join(os.path.dirname(__file__), "models", "encodings.npz")
# preset thong so hay dung
PRESETS = {
    "precision": dict(
        thresh=0.52,
        conf_thresh=0.50,
        margin=0.22,
        vote=13,
        enter=4,
    ),
    "hi_precision": dict(
        thresh=0.82,
        conf_thresh=0.60,
        margin=0.20,
        vote=15,
        enter=5,
    ),
}

# === util ve =========================

def draw_box_label(img, box, text, score=None, color=(80, 255, 80)):
    # box co the la (x,y,w,h) hoac (x,y,s,s)
    b = np.array(box, dtype=float).ravel()
    if b.size != 4:
        return
    x, y, w, h = map(int, b)
    cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
    if score is not None:
        text = f"{text} {score:.3f}"
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
    cv2.rectangle(img, (x, y - th - 8), (x + tw + 6, y), color, -1)
    cv2.putText(img, text, (x + 3, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

def cosine_top1(db_embs, db_labels, q):
    # db_embs va q deu L2 norm -> cosine = dot
    sims = db_embs @ q
    i = int(np.argmax(sims))
    return db_labels[i], float(sims[i])

# === live ============================

def save_capture(frame_bgr, box, args, mbf, label, score):
    args.capture_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    raw_path = args.capture_dir / f"{args.capture_prefix}_{ts}.jpg"
    cv2.imwrite(str(raw_path), frame_bgr)
    face_path = None
    if args.capture_face and box is not None:
        face, _ = crop_face_bgr(
            frame_bgr,
            box=box,
            margin=args.margin,
            out_size=mbf.size,
        )
        if face is not None:
            face_path = args.capture_dir / f"{args.capture_prefix}_{ts}_face.jpg"
            cv2.imwrite(str(face_path), face)
    print(f"[CAPTURE] saved {raw_path}" + (f" (face -> {face_path})" if face_path else ""))


def recognize_faces(mbf, labels, embs, frame_bgr, thresh, det_cfg, flip_aug=False):
    # YOLO NCNN nhan anh BGR truc tiep, khong can gray
    boxes = detect_boxes(
        frame_bgr,
        conf_thresh=det_cfg.get("conf_thresh", 0.45),
    )
    results = []
    for (x, y, w, h) in boxes:
        face, used = crop_face_bgr(
            frame_bgr,
            box=(x, y, w, h),
            margin=det_cfg["margin"],
            out_size=mbf.size,
            smooth=True,
        )
        if face is None:
            continue
        q = mbf.embed_bgr(face, flip_aug=flip_aug)  # (D,) da L2 norm
        lb, sc = cosine_top1(embs, labels, q)
        if sc < thresh:
            lb = "Unknown"
        results.append((used, lb, sc))
    return results

def open_camera(width, height, no_picam=False):
    if not no_picam:
        try:
            from picamera2 import Picamera2  # type: ignore
            cam = Picamera2()
            cam_config = cam.create_preview_configuration(main={"size": (width, height), "format": "RGB888"})
            cam.configure(cam_config)
            cam.start()
            return "picam2", cam
        except Exception:
            pass
    # fallback opencv (gstreamer tren Pi 5)
    cap = cv2.VideoCapture(
        "libcamerasrc ! video/x-raw,width=%d,height=%d,framerate=30/1,format=RGB ! videoconvert ! video/x-raw,format=BGR ! appsink"
        % (width, height),
        cv2.CAP_GSTREAMER,
    )
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)
    return "opencv", cap

def main():
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--thresh", type=float, default=0.60, help="nguong cosine 0..1")
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=480)
    ap.add_argument("--no-picam", action="store_true")
    ap.add_argument("--preset", choices=sorted(PRESETS.keys()), help="chon bo tham so san (vd precision)")

    # tham so YOLO NCNN detect
    ap.add_argument("--conf-thresh", type=float, default=0.45, help="nguong confidence YOLO (mac dinh 0.45)")
    ap.add_argument("--margin", type=float, default=0.35, help="ti le mo rong box, vd 0.35")
    flip_group = ap.add_mutually_exclusive_group()
    flip_group.add_argument("--flip-aug", dest="flip_aug", action="store_true",
                            help="dung trung binh embedding voi anh flip")
    flip_group.add_argument("--no-flip-aug", dest="flip_aug", action="store_false",
                            help="tat flip augmentation (mac dinh)")
    ap.set_defaults(flip_aug=False)
    ap.add_argument("--capture-dir", type=Path, default=Path("captures"),
                    help="thu muc luu frame khi bam 's'")
    ap.add_argument("--capture-prefix", default="frame",
                    help="ten file bat dau bang prefix nay")
    ap.add_argument("--capture-face", action="store_true",
                    help="luu them mat da crop khi bam 's'")
    ap.add_argument("--auto-capture", action="store_true",
                    help="tu dong chup moi khi nhan dien on dinh")
    ap.add_argument("--auto-capture-unknown", action="store_true",
                    help="van chup neu ket qua la Unknown")
    ap.add_argument("--auto-capture-interval", type=float, default=2.5,
                    help="so giay toi thieu giua cac lan chup tu dong")

    # chong nhap nhay nhan (bo phieu)
    ap.add_argument("--vote", type=int, default=5, help="kich thuoc cua cua so bo phieu")
    ap.add_argument("--enter", type=int, default=3, help="so khung cuoi phai trung nhau")
    args = ap.parse_args()

    if args.preset:
        preset_cfg = PRESETS[args.preset]
        for key, value in preset_cfg.items():
            setattr(args, key, value)

    # load model
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Missing model: {MODEL_PATH}")
    if not os.path.exists(INDEX_PATH):
        raise FileNotFoundError(f"Missing index: {INDEX_PATH}. Hay chay build_index_mbf.py")

    npz = np.load(INDEX_PATH, allow_pickle=False)
    labels = npz["labels"].astype(str)
    embs = npz["embs"].astype(np.float32)
    # dam bao L2 norm
    embs = l2norm(embs)

    mbf = MobileFaceNet(MODEL_PATH, flip_aug=args.flip_aug)

    det_cfg = dict(
        conf_thresh=args.conf_thresh,
        margin=args.margin,
    )

    # camera
    backend, cam = open_camera(args.width, args.height, args.no_picam)
    print(f"[READY] labels={len(labels)} dim={embs.shape[1]} nhwc={mbf.is_nhwc} th={args.thresh} backend={backend}")

    # bo phieu
    buf = deque(maxlen=args.vote)
    reset_smooth_box()

    t0 = time.time()
    n = 0
    last_capture_ts = 0.0
    while True:
        # lay frame
        if backend == "picam2":
            frame = cam.capture_array()
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        else:
            ok, frame_bgr = cam.read()
            if not ok:
                print("Khong doc duoc frame")
                break

        # nhan dien
        results = recognize_faces(mbf, labels, embs, frame_bgr, args.thresh, det_cfg, args.flip_aug)

        # bo phieu don gian: lay nhan co score cao nhat khung nay, them vao buf
        best_label, best_score, best_box = "Unknown", 0.0, None
        for b, lb, sc in results:
            if sc > best_score:
                best_label, best_score, best_box = lb, sc, b
        if best_box is not None:
            buf.append((best_label, best_score))
        else:
            buf.append(("Unknown", 0.0))

        # kiem tra on dinh enter frame cuoi
        stable = False
        if len(buf) == buf.maxlen:
            last = [lb for lb, _ in list(buf)[-args.enter:]]
            if all(x == last[0] for x in last) and last[0] != "Unknown":
                stable = True

        # ve
        if best_box is not None:
            label_to_show = best_label if stable else "Unknown"
            score_to_show = best_score if stable else np.mean([s for _, s in buf])
            draw_box_label(frame_bgr, best_box, label_to_show, score_to_show)

        # fps
        n += 1
        if n % 10 == 0:
            dt = time.time() - t0
            fps = n / max(dt, 1e-6)
            t0, n = time.time(), 0
            cv2.putText(frame_bgr, f"FPS: {fps:.1f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (240, 240, 240), 2)
        else:
            cv2.putText(frame_bgr, f"FPS:", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (240, 240, 240), 2)

        if args.auto_capture and best_box is not None:
            should_capture = stable or args.auto_capture_unknown
            if should_capture and (time.time() - last_capture_ts) >= args.auto_capture_interval:
                save_capture(frame_bgr.copy(), best_box, args, mbf, best_label, best_score)
                last_capture_ts = time.time()

        cv2.imshow("live recognize (Picam)", frame_bgr)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("s"):
            save_capture(frame_bgr.copy(), best_box, args, mbf, best_label, best_score)

    # cleanup
    if backend == "picam2":
        cam.stop()
    else:
        cam.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
