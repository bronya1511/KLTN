#!/usr/bin/env python3
# recognize_local.py
# Comment khong dau theo yeu cau
# Chuc nang:
#  - --image PATH: nhan dien 1 anh
#  - --dir   DIR : nhan dien nhieu anh trong thu muc
#  - --camera    : chup 1 frame bang Picamera2 roi nhan dien
# Yeu cau: models/mobilefacenet.onnx, models/encodings.npz, detect_face_ncnn.py, mobilefacenet_onnx.py

import os, sys, glob, argparse
import numpy as np
import cv2
from pathlib import Path

from detect_face_ncnn import crop_face_bgr
from mobilefacenet_onnx import MobileFaceNet, l2norm

BASE_DIR      = Path(__file__).resolve().parent
MODEL_PATH    = os.environ.get("MBF_MODEL", str(BASE_DIR / "models" / "mobilefacenet.onnx"))
INDEX_PATH    = os.environ.get("INDEX_PATH", str(BASE_DIR / "models" / "encodings.npz"))
SCORE_TH      = float(os.environ.get("SCORE_TH", "0.45"))  # nguong cosine (0..1)
SCORE_MARGIN  = float(os.environ.get("SCORE_MARGIN", "0.05"))
DET_CONF_TH   = float(os.environ.get("DET_CONF_TH", "0.45"))  # nguong confidence YOLO

def load_index(path: str):
    if not Path(path).exists():
        raise FileNotFoundError(f"Missing encodings npz: {path}")
    data = np.load(path, allow_pickle=False)
    labels = np.asarray(data["labels"]).astype(str).tolist()
    embs   = data["embs"].astype(np.float32)
    if embs.ndim != 2:
        raise ValueError(f"Invalid embedding matrix shape: {embs.shape}")
    # dam bao L2
    embs = l2norm(embs)
    return labels, embs

def recognize_image(
    mbf: MobileFaceNet,
    db_labels,
    db_embs,
    img_bgr,
    expand=0.20,
    det_score_th: float | None = None,
    score_th: float | None = None,
    score_margin: float | None = None,
    flip_aug: bool = False,
):
    # tra ve dict {name, score, box, ok}
    det_kwargs = {}
    # crop_face_bgr cua ncnn su dung conf_thresh
    if det_score_th is not None and det_score_th >= 0:
        det_kwargs["conf_thresh"] = min(det_score_th, 1.0)  # gioi han trong khoang hop le YOLO
    face, box = crop_face_bgr(img_bgr, expand=expand, **det_kwargs)
    if face is None:
        return {"ok":True, "name":"NoFace", "score":0.0, "box":None}
    q = mbf.embed_bgr(face, flip_aug=flip_aug).astype(np.float32)
    sims = db_embs @ q
    idx = int(np.argmax(sims))
    score = float(sims[idx])
    if sims.size > 1:
        second = float(np.sort(sims)[-2])
    else:
        second = -1.0
    margin = score - second
    th = SCORE_TH if score_th is None else score_th
    mg = SCORE_MARGIN if score_margin is None else score_margin
    good = score >= th and margin >= mg
    name = db_labels[idx] if good else "Unknown"
    return {"ok":True, "name":name, "score":score, "margin":margin, "box":box}

def read_bgr(path: str):
    buf = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)

def draw_and_save(img_bgr, result, out_path):
    box = result.get("box")
    if box:
        x,y,w,h = map(int, box)
        cv2.rectangle(img_bgr, (x,y), (x+w,y+h), (0,255,0), 2)
    label = f'{result.get("name")} {result.get("score",0):.3f}'
    cv2.putText(img_bgr, label, (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
    cv2.imwrite(out_path, img_bgr)

def run_camera_once():
    # dung Picamera2 de chup 1 khung (khong can GUI)
    try:
        from picamera2 import Picamera2
    except Exception as e:
        raise RuntimeError("Chua cai python3-picamera2. Hay: sudo apt-get install -y python3-picamera2") from e
    picam2 = Picamera2()
    cfg = picam2.create_preview_configuration(main={"size":(640,480), "format":"BGR888"})
    picam2.configure(cfg)
    picam2.start()
    import time; time.sleep(0.3)
    frame = picam2.capture_array()
    picam2.stop()
    return frame

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--image", help="duong dan 1 anh dau vao")
    g.add_argument("--dir", help="thu muc chua anh de quet")
    g.add_argument("--camera", action="store_true", help="chup 1 frame tu Pi Camera")
    ap.add_argument("--out", default=str(BASE_DIR / "out"), help="thu muc out ve hinh co ve khung")
    ap.add_argument("--expand", type=float, default=0.20, help="ti le mo rong box khi crop")
    ap.add_argument("--det-score-th", type=float, default=DET_CONF_TH,
                    help="nguong confidence YOLO (mac dinh 0.45)")
    ap.add_argument("--score-th", type=float, default=SCORE_TH, help="nguong cosine 0..1")
    ap.add_argument("--score-margin", type=float, default=SCORE_MARGIN,
                    help="dong y neu top1-top2 >= margin")
    flip_group = ap.add_mutually_exclusive_group()
    flip_group.add_argument("--flip-aug", dest="flip_aug", action="store_true",
                            help="dung trung binh embedding voi anh flip (default)")
    flip_group.add_argument("--no-flip-aug", dest="flip_aug", action="store_false",
                            help="tat flip augmentation")
    ap.set_defaults(flip_aug=True)
    args = ap.parse_args()

    print("[INFO] model  :", MODEL_PATH)
    print("[INFO] index  :", INDEX_PATH)
    print("[INFO] outdir :", args.out)
    os.makedirs(args.out, exist_ok=True)

    # load model + index
    mbf = MobileFaceNet(MODEL_PATH, flip_aug=args.flip_aug)
    labels, embs = load_index(INDEX_PATH)
    print(f"[READY] labels={len(labels)} dim={embs.shape[1]} nhwc={getattr(mbf,'is_nhwc','?')}")

    if args.image:
        img = read_bgr(args.image)
        if img is None:
            print("[ERR ] khong doc duoc anh:", args.image)
            sys.exit(2)
        res = recognize_image(
            mbf, labels, embs, img, args.expand,
            args.det_score_th, args.score_th, args.score_margin,
            flip_aug=args.flip_aug,
        )
        print(f"[RES ] {Path(args.image).name}: name={res['name']} "
              f"score={res['score']:.3f} margin={res.get('margin',0):.3f} box={res['box']}")
        outp = str(Path(args.out) / (Path(args.image).stem + "_vis.jpg"))
        draw_and_save(img, res, outp)
        print("[SAVE]", outp)
        return

    if args.dir:
        paths = []
        for ext in ("*.jpg","*.jpeg","*.png","*.bmp"):
            paths += glob.glob(os.path.join(args.dir, ext))
        if not paths:
            print("[ERR ] thu muc khong co anh:", args.dir)
            sys.exit(2)
        ok = 0
        for p in sorted(paths):
            img = read_bgr(p)
            if img is None:
                print("[WARN] skip doc loi:", p); continue
            res = recognize_image(
                mbf, labels, embs, img, args.expand,
                args.det_score_th, args.score_th, args.score_margin,
                flip_aug=args.flip_aug,
            )
            print(f"[RES ] {Path(p).name}: {res['name']} "
                  f"{res['score']:.3f} (margin {res.get('margin',0):.3f})")
            outp = str(Path(args.out) / (Path(p).stem + "_vis.jpg"))
            draw_and_save(img, res, outp)
            ok += 1
        print("[DONE]", ok, "anh xu ly")
        return

    if args.camera:
        img = run_camera_once()
        res = recognize_image(
            mbf, labels, embs, img, args.expand,
            args.det_score_th, args.score_th, args.score_margin,
            flip_aug=args.flip_aug,
        )
        print(f"[RES ] camera: name={res['name']} score={res['score']:.3f} "
              f"margin={res.get('margin',0):.3f} box={res['box']}")
        outp = str(Path(args.out) / "camera_vis.jpg")
        draw_and_save(img, res, outp)
        print("[SAVE]", outp)
        return

if __name__ == "__main__":
    main()
