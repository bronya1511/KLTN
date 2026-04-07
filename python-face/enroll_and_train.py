#!/usr/bin/env python3
"""
enroll_and_train.py

Flow:
- Nhập MSSV/label
- Nếu dataset/<label> đã có ảnh -> train luôn vào models/encodings.npz (MobileFaceNet)
- Nếu chưa có -> mở camera chụp ảnh vào dataset/<label> rồi train

Default dataset path: python-face/dataset (relative to this file)
"""

import argparse
import os

from pathlib import Path

from register_face import capture_images, has_images
from train_mbf_label import train_label_into_index


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("label", nargs="?", help="MSSV/label (vd: 994). Nếu bỏ trống sẽ hỏi input()")
    ap.add_argument("--dataset", default="dataset", help="Dataset root (mặc định: dataset)")
    ap.add_argument("--camera", type=int, default=0, help="Camera index (mặc định: 0)")
    ap.add_argument("--num", type=int, default=10, help="Số ảnh sẽ chụp nếu chưa có (mặc định: 10)")
    ap.add_argument("--model", default="models/mobilefacenet.onnx", help="ONNX model path")
    ap.add_argument("--index", default="models/encodings.npz", help="Index path (npz)")
    ap.add_argument("--no-replace", dest="replace", action="store_false", help="Không xoá embedding cũ của label")
    ap.add_argument("--replace", dest="replace", action="store_true", default=True, help="Xoá embedding cũ rồi train lại (mặc định)")
    args = ap.parse_args()

    label = args.label or input("Nhap MSSV/label: ").strip()
    if not label:
        raise SystemExit("Label rong.")

    base_dir = Path(__file__).resolve().parent
    dataset_dir = (base_dir / args.dataset).resolve()
    model_path = (base_dir / args.model).resolve()
    index_path = (base_dir / args.index).resolve()

    target_dir = dataset_dir / label
    if has_images(str(target_dir)):
        print(f"[OK] Da co anh trong {target_dir}, se train ngay.")
    else:
        print(f"[INFO] Chua co anh cho '{label}'. Mo camera de chup...")
        os.makedirs(target_dir, exist_ok=True)
        capture_images(str(target_dir), cam_idx=args.camera, num=int(args.num))

    res = train_label_into_index(
        label=label,
        dataset_dir=dataset_dir,
        model_path=model_path,
        index_path=index_path,
        replace=bool(args.replace),
    )
    print(
        "[DONE] label={label} used={images_used}/{images_total} added_rows={added_rows} -> {index_path}".format(
            **res
        )
    )
    print("[NOTE] Neu service dang chay, goi /api/face/reload hoac restart de nap index moi.")


if __name__ == "__main__":
    main()

