#!/usr/bin/python3
import face_recognition
import pickle
import cv2
import os
from pathlib import Path
from detect_face_ncnn import detect_boxes

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
ENCODINGS_PATH = BASE_DIR / "encodings.pickle"

print("[INFO] Bat dau qua trinh train...")

# Buoc 1: Load file encodings da co (neu ton tai)
if ENCODINGS_PATH.exists():
    print("[INFO] Phat hien file encodings.pickle. Dang tai du lieu cu...")
    data = pickle.loads(open(ENCODINGS_PATH, "rb").read())
    knownEncodings = data["encodings"]
    knownNames = data["names"]
else:
    print("[INFO] Khong tim thay file encodings.pickle. Khoi tao du lieu moi...")
    knownEncodings = []
    knownNames = []

# Lay danh sach cac MSSV da duoc train de kiem tra
trainedNames = set(knownNames)
print(f"[INFO] Cac MSSV da co trong he thong: {trainedNames if trainedNames else 'Chua co ai'}")

# Buoc 2: Duyet qua cac thu muc trong dataset de tim MSSV moi
print("[INFO] Kiem tra cac thu muc trong dataset...")
new_students_trained_count = 0

# Lay danh sach tat ca thu muc MSSV hien co trong dataset
current_student_dirs = [
    d for d in os.listdir(DATASET_DIR)
    if (DATASET_DIR / d).is_dir()
]

for student_id in current_student_dirs:
    # Neu MSSV da duoc train, bo qua
    if student_id in trainedNames:
        print(f"-> MSSV '{student_id}' da duoc train. Bo qua.")
        continue

    # Neu la MSSV moi, bat dau xu ly
    print(f"[INFO] Phat hien MSSV moi: '{student_id}'. Bat dau xu ly anh...")
    new_students_trained_count += 1
    student_dir_path = DATASET_DIR / student_id

    # Duyet qua tung anh cua MSSV moi
    for filename in os.listdir(student_dir_path):
        if filename.lower().endswith((".jpg", ".png", ".jpeg")):
            path = student_dir_path / filename

            print(f"  -> Dang xu ly anh: {path}")
            image = cv2.imread(str(path))
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            ncnn_boxes = detect_boxes(rgb, conf_thresh=0.45)
            # face_recognition expects (top, right, bottom, left)
            boxes = [(y, x + w, y + h, x) for x, y, w, h in ncnn_boxes]
            encodings = face_recognition.face_encodings(rgb, boxes)

            # Them cac encoding vao danh sach
            for encoding in encodings:
                knownEncodings.append(encoding)
                knownNames.append(student_id)

# Buoc 3: Luu lai file encodings neu co du lieu moi
if new_students_trained_count > 0:
    print(f"\n[INFO] Da train them {new_students_trained_count} MSSV moi.")
    print("[INFO] Dang cap nhat file encodings.pickle...")
    
    data = {"encodings": knownEncodings, "names": knownNames}
    with open(ENCODINGS_PATH, "wb") as f:
        f.write(pickle.dumps(data))
        
    print("[INFO] Hoan thanh cap nhat.")
else:
    print("\n[INFO] Khong co MSSV moi nao de train. Du lieu da duoc cap nhat day du.")
