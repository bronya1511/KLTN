-- Thêm cột tài khoản/mật khẩu cho bảng sinh_vien (nếu chưa có)
ALTER TABLE sinh_vien
  ADD COLUMN IF NOT EXISTS tai_khoan VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mat_khau VARCHAR(255) DEFAULT NULL;
