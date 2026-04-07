"""
register_face.py

Usage:
  python register_face.py <label> [--folder dataset] [--camera 0] [--num 5]
  python enroll_and_train.py <label> [--num 10] [--camera 0]

Logic:
- Kiểm tra thư mục dataset/<label>. Nếu đã có ảnh thì chỉ thông báo và thoát.
- Nếu chưa có, mở camera (OpenCV), chụp <num> ảnh và lưu vào dataset/<label>/img_XX.jpg.

Ghi chú:
- Mặc định dùng webcam/OpenCV. Nếu cần PiCamera2, có thể sửa trong phần _open_camera().
- Để tự động train MobileFaceNet sau khi có ảnh, dùng `enroll_and_train.py`.
"""

import argparse
import os
import time
import cv2


def _open_camera(cam_idx: int):
    cap = cv2.VideoCapture(cam_idx)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được camera (index={cam_idx})")
    return cap


def ensure_dir(path: str):
    if not os.path.isdir(path):
        os.makedirs(path, exist_ok=True)


def has_images(dir_path: str) -> bool:
    if not os.path.isdir(dir_path):
        return False
    exts = (".jpg", ".jpeg", ".png", ".bmp")
    for fn in os.listdir(dir_path):
        if fn.lower().endswith(exts):
            return True
    return False


def capture_images(save_dir: str, cam_idx: int = 0, num: int = 5):
    ensure_dir(save_dir)
    cap = _open_camera(cam_idx)
    print(f"[INFO] Mở camera {cam_idx}, sẽ chụp {num} ảnh. Nhấn Ctrl+C để hủy.")
    try:
        for i in range(num):
            ok, frame = cap.read()
            if not ok or frame is None:
                print("[WARN] Không đọc được frame, bỏ qua.")
                time.sleep(0.5)
                continue
            path = os.path.join(save_dir, f"img_{i+1:02d}.jpg")
            cv2.imwrite(path, frame)
            print(f"[OK] Đã lưu {path}")
            time.sleep(0.4)
    finally:
        cap.release()
        cv2.destroyAllWindows()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("label", help="Tên thư mục/người (vd: mssv)")
    ap.add_argument("--folder", default="dataset", help="Thư mục gốc chứa ảnh (mặc định: dataset)")
    ap.add_argument("--camera", type=int, default=0, help="Camera index cho OpenCV (mặc định: 0)")
    ap.add_argument("--num", type=int, default=5, help="Số ảnh cần chụp nếu chưa có ảnh (mặc định: 5)")
    args = ap.parse_args()

    target_dir = os.path.join(args.folder, args.label)
    if has_images(target_dir):
        print(f"[OK] Đã có ảnh trong {target_dir}, không cần chụp thêm.")
        return

    print(f"[INFO] Chưa có ảnh cho '{args.label}'. Bắt đầu mở camera để chụp...")
    capture_images(target_dir, cam_idx=args.camera, num=args.num)
    print("[DONE] Hoàn tất.")


if __name__ == "__main__":
    main()
