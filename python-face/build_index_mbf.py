# build_index_mbf.py
# Tao index embedding cho MobileFaceNet tu dataset co san
# Su dung YOLO NCNN de detect khuon mat
# Comment TV khong dau

import os
import cv2, time, glob, numpy as np
from pathlib import Path
from mobilefacenet_onnx import MobileFaceNet, l2norm
from detect_face_ncnn import detect_boxes, crop_face_bgr

BASE_DIR    = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
MODEL_PATH  = BASE_DIR / "models" / "mobilefacenet.onnx"
OUT_PATH    = BASE_DIR / "models" / "encodings.npz"

# thong so detect/crop dong bo voi live (YOLO NCNN)
DET_CONF_TH    = float(os.environ.get("DET_CONF_TH", "0.45"))  # nguong confidence YOLO
INDEX_FLIP_AUG = bool(int(os.environ.get("INDEX_FLIP_AUG", "1")))
CROP_MARGIN    = 0.30     # 0.2 ~ 0.4 hop ly

def imread_bgr(path: Path):
    buf = np.fromfile(str(path), dtype=np.uint8)
    if buf.size == 0:
        return None
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    return img

def find_face(img_bgr):
    # Su dung YOLO NCNN, khong can anh gray
    boxes = detect_boxes(
        img_bgr,
        conf_thresh=DET_CONF_TH,
    )
    if not boxes:
        return None
    areas = [(w*h, (x,y,w,h)) for (x,y,w,h) in boxes]
    areas.sort(reverse=True, key=lambda t: t[0])
    return areas[0][1]

def safe_face(img_bgr, out_size: int):
    box = find_face(img_bgr)
    if box is None:
        return None
    face, _ = crop_face_bgr(img_bgr, box, out_size=out_size, margin=CROP_MARGIN)

    # kiem tra hop le
    if face is None or not isinstance(face, np.ndarray):
        return None
    if face.dtype != np.uint8:
        face = face.astype(np.uint8, copy=False)
    return face

def main():
    print(f"[INFO] dataset = {DATASET_DIR}")
    print(f"[INFO] model   = {MODEL_PATH}")
    print(f"[INFO] out     = {OUT_PATH}")

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing ONNX model: {MODEL_PATH}")
    if not DATASET_DIR.exists():
        raise FileNotFoundError(f"Missing dataset dir: {DATASET_DIR}")

    mbf = MobileFaceNet(str(MODEL_PATH), flip_aug=INDEX_FLIP_AUG)
    print(f"[STEP] model ready. NHWC? {mbf.is_nhwc} size={mbf.size}")

    label_dirs = sorted([p for p in DATASET_DIR.iterdir() if p.is_dir()], key=lambda p: p.name)
    print(f"[STEP] found {len(label_dirs)} label dirs: {[p.name for p in label_dirs]}")

    labels, embs = [], []
    t0 = time.time()

    for d in label_dirs:
        img_files = []
        # duyệt đệ quy, hỗ trợ cả phần mở rộng viết hoa
        exts = {".jpg", ".jpeg", ".png", ".bmp"}
        for p in d.rglob("*"):
            if p.is_file() and p.suffix.lower() in exts:
                img_files.append(p)
        img_files = sorted(img_files)
        print(f"[STEP] {d.name}: {len(img_files)} anh (ke ca phu duoi viet hoa)")

        used = 0
        for p in img_files:
            img = imread_bgr(p)
            if img is None:
                continue
            face = safe_face(img, mbf.size)
            if face is None:
                continue

            try:
                emb = mbf.embed_bgr(face)      # (D,), da L2-norm
            except Exception as e:
                # phong truong hop dau vao khong hop le
                # bo qua anh nay
                continue

            embs.append(emb.astype(np.float32))
            labels.append(d.name)
            used += 1

        print(f"[OK] {d.name}: {used} imgs")

    if not embs:
        raise RuntimeError("Khong co embedding nao duoc tao. Kiem tra dataset va detect.")

    embs_np   = np.stack(embs, axis=0)
    labels_np = np.array(labels)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(str(OUT_PATH), labels=labels_np, embs=embs_np)
    print(f"[DONE] saved index -> {OUT_PATH} | labels={len(set(labels))} | dim={embs_np.shape[1]} | imgs={len(labels)}")
    print(f"[TIME] {time.time()-t0:.2f}s")

if __name__ == "__main__":
    main()
