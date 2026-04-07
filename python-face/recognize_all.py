# recognize_all.py
# NOTE: comment khong dau

import os
import csv
import time
import glob
import argparse
import cv2
import numpy as np

from mobilefacenet_onnx import MobileFaceNet, l2norm
from detect_face_ncnn import detect_boxes, crop_face_bgr

BASE_DIR   = os.path.dirname(__file__)
DATASET    = os.path.join(BASE_DIR, "dataset")
MODEL_PATH = os.path.join(BASE_DIR, "models", "mobilefacenet.onnx")
INDEX_PATH = os.path.join(BASE_DIR, "models", "encodings.npz")
OUT_DIR    = os.path.join(BASE_DIR, "out_all")
CSV_PATH   = os.path.join(OUT_DIR, "results.csv")

# tham so nhan dien
THRESH = 0.55          # nguong tin cay cosine
TOPK   = 1             # lay ket qua tot nhat
SCORE_MARGIN = 0.05

# tham so YOLO NCNN detect
DEFAULT_DET_CFG = dict(
    conf_thresh  = 0.45,   # nguong confidence YOLO
)

# margin mo rong khi crop tu bbox (pixel)
CROP_MARGIN = 0.30  # ti le mo rong bbox truoc khi resize


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def load_index(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing index: {path}. Hay chay build_index_mbf.py truoc")
    data = np.load(path, allow_pickle=False)
    labels = np.asarray(data["labels"]).astype(str).tolist()
    embs   = data["embs"].astype(np.float32)
    if embs.ndim != 2:
        raise ValueError(f"Invalid embedding matrix shape: {embs.shape}")
    # dam bao L2
    embs = l2norm(embs)
    return labels, embs


def best_match(db_labels, db_embs, emb):
    # cosine (vi embs da L2 => dot = cosine)
    sims = db_embs @ emb.astype(np.float32)
    k = int(min(TOPK, sims.size))
    idxs = np.argpartition(-sims, k-1)[:k]
    best_i = int(idxs[np.argmax(sims[idxs])])
    if sims.size > 1:
        second = float(np.sort(sims)[-2])
    else:
        second = -1.0
    return db_labels[best_i], float(sims[best_i]), float(second)


def process_image(
    mbf,
    db_labels,
    db_embs,
    img_bgr,
    det_cfg,
    crop_margin,
    score_th,
    score_margin,
    flip_aug,
):
    h, w = img_bgr.shape[:2]
    # YOLO NCNN nhan anh BGR truc tiep
    boxes = detect_boxes(
        img_bgr,
        conf_thresh=det_cfg.get("conf_thresh", 0.45),
    )
    if not boxes:
        return "Unknown", 0.0, 0.0, None

    # chon box lon nhat
    areas = [(bw * bh) for (x, y, bw, bh) in boxes]
    i = int(np.argmax(areas))
    box = boxes[i]

    face, box_used = crop_face_bgr(
        img_bgr,
        box,
        out_size=mbf.size,
        margin=crop_margin,
    )
    if face is None:
        return "Unknown", 0.0, 0.0, None
    emb = mbf.embed_bgr(face, flip_aug=flip_aug)
    label, score, second = best_match(db_labels, db_embs, emb)
    margin = score - second
    if not (score >= score_th and margin >= score_margin):
        label = "Unknown"
    return label, score, margin, box_used or box


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=MODEL_PATH, help="duong dan MobileFaceNet ONNX")
    ap.add_argument("--index", default=INDEX_PATH, help="duong dan encodings.npz")
    ap.add_argument("--dataset", default=DATASET, help="thu muc dataset dau vao")
    ap.add_argument("--out", default=OUT_DIR, help="thu muc luu visualization")
    ap.add_argument("--csv", default="", help="duong dan CSV (mac dinh out/results.csv)")
    ap.add_argument("--score-th", type=float, default=THRESH, help="nguong cosine 0..1")
    ap.add_argument("--score-margin", type=float, default=SCORE_MARGIN,
                    help="yeu cau top1 - top2 >= margin")
    ap.add_argument("--crop-margin", type=float, default=CROP_MARGIN,
                    help="ti le mo rong box truoc khi resize")
    ap.add_argument("--conf-thresh", type=float, default=DEFAULT_DET_CFG["conf_thresh"],
                    help="nguong confidence YOLO (mac dinh 0.45)")
    flip_group = ap.add_mutually_exclusive_group()
    flip_group.add_argument("--flip-aug", dest="flip_aug", action="store_true",
                            help="dung trung binh embedding voi anh flip (default)")
    flip_group.add_argument("--no-flip-aug", dest="flip_aug", action="store_false",
                            help="tat flip augmentation")
    ap.set_defaults(flip_aug=True)
    args = ap.parse_args()

    dataset = args.dataset
    out_dir = args.out
    csv_path = args.csv or os.path.join(out_dir, "results.csv")

    t0 = time.time()
    print(f"[INFO] model   : {args.model}")
    print(f"[INFO] index   : {args.index}")
    print(f"[INFO] dataset : {dataset}")
    print(f"[INFO] outdir  : {out_dir}")
    ensure_dir(out_dir)

    labels, embs = load_index(args.index)
    print(f"[READY] labels={len(labels)} dim={embs.shape[1]} th={args.score_th} margin={args.score_margin}")

    mbf = MobileFaceNet(args.model, flip_aug=args.flip_aug)

    det_cfg = dict(
        conf_thresh=args.conf_thresh,
    )

    rows = [("file", "predict", "score", "margin")]
    total = 0

    # duyet tat ca anh trong cac thu muc con
    for person in sorted(os.listdir(dataset)):
        pdir = os.path.join(dataset, person)
        if not os.path.isdir(pdir):
            continue
        files = sorted(
            f for f in glob.glob(os.path.join(pdir, "*"))
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        )
        if not files:
            continue
        print(f"[SCAN] {person}: {len(files)} files")
        for fpath in files:
            img = cv2.imdecode(np.fromfile(fpath, dtype=np.uint8), cv2.IMREAD_COLOR)
            rel = os.path.relpath(fpath, dataset)
            if img is None:
                rows.append((rel, "ERR_READ", "0.0", "0.0"))
                continue
            pred, score, margin, box = process_image(
                mbf, labels, embs, img, det_cfg, args.crop_margin,
                args.score_th, args.score_margin, args.flip_aug
            )
            rows.append((rel, pred, f"{score:.3f}", f"{margin:.3f}"))

            # ve va luu visualization
            vis = img.copy()
            if box is not None:
                x, y, bw, bh = box
                cv2.rectangle(vis, (x, y), (x + bw, y + bh), (0, 255, 0), 2)
                cv2.putText(
                    vis, f"{pred} {score:.3f}", (x, max(0, y - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA
                )
            out_img = os.path.join(out_dir, rel)
            os.makedirs(os.path.dirname(out_img), exist_ok=True)
            cv2.imencode(".jpg", vis)[1].tofile(out_img)

            total += 1

    # ghi CSV
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    print(f"[DONE] images={total} | csv={csv_path}")
    print(f"[TIME] {time.time() - t0:.2f}s")


if __name__ == "__main__":
    main()
