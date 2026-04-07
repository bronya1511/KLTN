-- Tạo bảng users lưu tài khoản đăng nhập và phân quyền
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','giang_vien','sinh_vien') NOT NULL DEFAULT 'sinh_vien',
  mssv VARCHAR(10) DEFAULT NULL,
  ma_giang_vien VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Thêm tài khoản mẫu (admin/admin123, gv01/123456, sv01/123456)
INSERT IGNORE INTO users (username, password_hash, role, mssv, ma_giang_vien) VALUES
  ('admin@example.com', '$2a$10$6AWuEg41jXhT13gNICOI6uKxQKNMbhuzFsGOHLu61mJYk0gIgD01G', 'admin', NULL, NULL),
  ('gv01', '$2a$10$6AWuEg41jXhT13gNICOI6uKxQKNMbhuzFsGOHLu61mJYk0gIgD01G', 'giang_vien', NULL, '1'),
  ('sv01', '$2a$10$6AWuEg41jXhT13gNICOI6uKxQKNMbhuzFsGOHLu61mJYk0gIgD01G', 'sinh_vien', '22521379', NULL);
