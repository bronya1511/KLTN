-- Sửa trigger đồng bộ lịch sử để không còn phụ thuộc vào các cột đã xóa
-- Chạy file này trong phpMyAdmin (tab SQL) hoặc mysql CLI:
--   SOURCE /path/to/database/fix_lich_su_trigger.sql;

DROP TRIGGER IF EXISTS trg_dong_bo_lich_su;
DELIMITER $$
CREATE TRIGGER trg_dong_bo_lich_su
AFTER INSERT ON diem_danh
FOR EACH ROW
BEGIN
    -- Ghi lịch sử chỉ với các cột hiện có
    INSERT INTO lich_su_diem_danh (
        mssv,
        ho_ten,
        lop,
        thoi_gian_diem_danh,
        ma_lop,
        trang_thai_diem_danh,
        ma_thiet_bi,
        do_tin_cay
    )
    SELECT
        s.mssv,
        s.ho_ten,
        s.lop,
        NEW.thoi_gian_diem_danh,
        NEW.ma_lop,
        NEW.trang_thai,
        NEW.ma_thiet_bi,
        NEW.do_tin_cay
    FROM sinh_vien s
    WHERE s.mssv = NEW.mssv;
END $$
DELIMITER ;
