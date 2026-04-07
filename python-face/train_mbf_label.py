#!/usr/bin/env python3
# train_mbf_label.py
# Add/replace one label's embeddings into MobileFaceNet index (encodings.npz)

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from detect_face_ncnn import detect_boxes, crop_face_bgr
from mobilefacenet_onnx import MobileFaceNet


def imread_bgr(path: Path):
    buf = np.fromfile(str(path), dtype=np.uint8)
    if buf.size == 0:
        return None
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def find_face_box(
    img_bgr: np.ndarray,
    *,
    conf_thresh: float,
):
    # YOLO NCNN nhan anh BGR truc tiep
    boxes = detect_boxes(
        img_bgr,
        conf_thresh=conf_thresh,
    )
    if not boxes:
        return None
    areas = [(w * h, (x, y, w, h)) for (x, y, w, h) in boxes]
    areas.sort(reverse=True, key=lambda t: t[0])
    return areas[0][1]


def safe_face(
    img_bgr: np.ndarray,
    *,
    out_size: int,
    margin: float,
    conf_thresh: float,
):
    box = find_face_box(
        img_bgr,
        conf_thresh=conf_thresh,
    )
    if box is None:
        return None
    face, _ = crop_face_bgr(img_bgr, box, out_size=out_size, margin=margin)
    if face is None or not isinstance(face, np.ndarray):
        return None
    if face.dtype != np.uint8:
        face = face.astype(np.uint8, copy=False)
    return face


def list_images(label_dir: Path):
    exts = {".jpg", ".jpeg", ".png", ".bmp"}
    files = []
    for p in label_dir.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            files.append(p)
    return sorted(files)


def train_label_into_index(
    *,
    label: str,
    dataset_dir: Path,
    model_path: Path,
    index_path: Path,
    replace: bool = True,
    flip_aug: bool = True,
    conf_thresh: float = 0.45,
    margin: float = 0.30,
):
    label = str(label)
    label_dir = dataset_dir / label
    if not label_dir.exists():
        raise FileNotFoundError(f"Missing label dir: {label_dir}")
    if not model_path.exists():
        raise FileNotFoundError(f"Missing model: {model_path}")

    t0 = time.time()
    mbf = MobileFaceNet(str(model_path), flip_aug=bool(flip_aug))

    img_files = list_images(label_dir)
    if not img_files:
        raise RuntimeError(f"No images found under {label_dir}")

    new_embs = []
    used = 0
    for p in img_files:
        img = imread_bgr(p)
        if img is None:
            continue
        face = safe_face(
            img,
            out_size=mbf.size,
            margin=float(margin),
            conf_thresh=float(conf_thresh),
        )
        if face is None:
            continue
        try:
            emb = mbf.embed_bgr(face).astype(np.float32)
        except Exception:
            continue
        new_embs.append(emb)
        used += 1

    if not new_embs:
        raise RuntimeError(
            f"Could not create any embeddings for label={label}. Check images/detection thresholds."
        )

    new_embs_np = np.stack(new_embs, axis=0)
    new_labels_np = np.array([label] * new_embs_np.shape[0], dtype=str)

    if index_path.exists():
        data = np.load(str(index_path), allow_pickle=False)
        old_labels = np.asarray(data["labels"]).astype(str)
        old_embs = data["embs"].astype(np.float32)
        if old_embs.ndim != 2:
            raise ValueError(f"Invalid embedding matrix shape: {old_embs.shape}")
    else:
        old_labels = np.array([], dtype=str)
        old_embs = np.zeros((0, new_embs_np.shape[1]), dtype=np.float32)

    if replace and old_labels.size:
        keep_mask = old_labels != label
        old_labels = old_labels[keep_mask]
        old_embs = old_embs[keep_mask]

    out_labels = np.concatenate([old_labels, new_labels_np], axis=0)
    out_embs = np.concatenate([old_embs, new_embs_np], axis=0)

    index_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(str(index_path), labels=out_labels, embs=out_embs)

    return {
        "label": label,
        "label_dir": str(label_dir),
        "images_total": len(img_files),
        "images_used": used,
        "added_rows": int(new_labels_np.shape[0]),
        "replaced": bool(replace),
        "index_path": str(index_path),
        "rows_total": int(out_labels.shape[0]),
        "unique_labels": int(len(set(out_labels.tolist()))),
        "dim": int(out_embs.shape[1]),
        "time_sec": float(time.time() - t0),
    }


def main():
    ap = argparse.ArgumentParser(description="Train 1 label into MobileFaceNet index (encodings.npz)")
    ap.add_argument("label", help="Label folder name (vd: 994)")
    ap.add_argument("--dataset", default="dataset", help="Dataset root (mặc định: dataset)")
    ap.add_argument("--model", default="models/mobilefacenet.onnx", help="ONNX model path")
    ap.add_argument("--index", default="models/encodings.npz", help="Index path (npz)")
    ap.add_argument("--replace", action="store_true", default=True, help="Remove existing label rows then add (default: true)")
    ap.add_argument("--no-replace", dest="replace", action="store_false", help="Do not remove existing label rows")
    ap.add_argument("--flip-aug", type=int, default=1, help="Flip augmentation (0/1), default=1")
    ap.add_argument("--conf-thresh", type=float, default=0.45, help="Nguong confidence YOLO (mac dinh 0.45)")
    ap.add_argument("--margin", type=float, default=0.30, help="Crop margin (default=0.30)")
    args = ap.parse_args()

    base_dir = Path(__file__).resolve().parent
    dataset_dir = (base_dir / args.dataset).resolve()
    model_path = (base_dir / args.model).resolve()
    index_path = (base_dir / args.index).resolve()

    res = train_label_into_index(
        label=str(args.label),
        dataset_dir=dataset_dir,
        model_path=model_path,
        index_path=index_path,
        replace=bool(args.replace),
        flip_aug=bool(int(args.flip_aug)),
        conf_thresh=float(args.conf_thresh),
        margin=float(args.margin),
    )

    print(
        "[DONE] saved -> {index_path} | added_rows={added_rows} | rows={rows_total} | unique_labels={unique_labels} | dim={dim} | time={time_sec:.2f}s".format(
            **res
        )
    )


if __name__ == "__main__":
    main()

