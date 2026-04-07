#!/usr/bin/python3
import argparse
import cv2
from pathlib import Path
from picamera2 import Picamera2

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
from detect_face_ncnn import detect_boxes

# ==============================
# CLI/interactive inputs
# ==============================
parser = argparse.ArgumentParser(description="Chup anh khuon mat bang PiCamera2")
parser.add_argument("mssv", nargs="?", help="MSSV can chụp, nếu bỏ trống sẽ hỏi tay")
parser.add_argument("num_images", nargs="?", type=int, default=None,
                    help="So luong anh muon chup (mac dinh 20)")
parser.add_argument("camera_index", nargs="?", type=int, default=0, help="Chi so camera Pi")
args = parser.parse_args()

student_id = (args.mssv or input("Nhap MSSV: ").strip())
if not student_id:
    print("[ERROR] Chua nhap MSSV hop le")
    exit(1)

max_images = args.num_images if args.num_images and args.num_images > 0 else 20
camera_index = args.camera_index if args.camera_index is not None else 0

save_path = DATASET_DIR / student_id
save_path.mkdir(parents=True, exist_ok=True)

# deleted haar dependency

# ==============================
# Khoi dong camera
# ==============================
cv2.startWindowThread()
picam2 = Picamera2(camera_num=camera_index)
picam2.configure(
    picam2.create_preview_configuration(main={"format": 'XRGB8888', "size": (640, 480)})
)
picam2.start()

# ==============================
# Tham so luu anh
# ==============================
count = 0

print(f"[INFO] Bat dau chup anh cho MSSV: {student_id}")
print(f"[INFO] Tu dong chup khi phat hien khuon mat... (target: {max_images} anh)")

while True:
    frame = picam2.capture_array()
    grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Phat hien khuon mat (su dung anh gray hoac rgb deu duoc, detect_boxes tu xu ly)
    faces = detect_boxes(frame, conf_thresh=0.45)

    for (x, y, w, h) in faces:
        # Ve khung xanh quanh mat (hien tren anh goc)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Cat khuon mat tu anh gray
        face_img = grey[y:y + h, x:x + w]

        # Luu anh khuon mat (dang gray)
        if count < max_images:
            count += 1
            img_path = save_path / f"{student_id}_{count}.jpg"
            cv2.imwrite(str(img_path), face_img)
            print(f"[INFO] Da luu {img_path}")

        # Neu da du anh thi thoat
        if count >= max_images:
            print(f"[INFO] Hoan thanh: {count} anh da duoc luu trong {save_path}")
            picam2.stop()
            cv2.destroyAllWindows()
            exit(0)

    cv2.imshow("Face Capture", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):  # Nhan 'q' de thoat khan cap
        break

cv2.destroyAllWindows()
