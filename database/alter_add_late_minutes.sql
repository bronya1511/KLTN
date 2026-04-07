-- Thêm cột so_phut_di_tre vào diem_danh và lich_su_diem_danh,
-- đồng thời cập nhật trigger để ghi lại giá trị đi trễ.

-- 1) Thêm cột nếu chưa có
ALTER TABLE diem_danh ADD COLUMN IF NOT EXISTS so_phut_di_tre INT NULL AFTER duong_dan_anh;
ALTER TABLE lich_su_diem_danh ADD COLUMN IF NOT EXISTS so_phut_di_tre INT NULL AFTER do_tin_cay;

-- 2) Drop và tạo lại trigger đồng bộ lịch sử
DROP TRIGGER IF EXISTS trg_dong_bo_lich_su;
DELIMITER $$
CREATE TRIGGER trg_dong_bo_lich_su
AFTER INSERT ON diem_danh
FOR EACH ROW
BEGIN
    INSERT INTO lich_su_diem_danh (
        mssv, ho_ten, lop,
        thoi_gian_diem_danh, ma_lop, trang_thai_diem_danh,
        ma_thiet_bi, do_tin_cay, duong_dan_anh, phien_ban_mo_hinh,
        so_phut_di_tre
    )
    SELECT
        s.mssv,
        s.ho_ten,
        s.lop,
        NEW.thoi_gian_diem_danh,
        NEW.ma_lop,
        NEW.trang_thai,
        NEW.ma_thiet_bi,
        NEW.do_tin_cay,
        NEW.duong_dan_anh,
        NEW.phien_ban_mo_hinh,
        NEW.so_phut_di_tre
    FROM sinh_vien s
    WHERE s.mssv = NEW.mssv;
END $$
DELIMITER ;

-- 3) (Tuỳ chọn) Cập nhật dữ liệu cũ: tính số phút đi trễ dựa trên giờ bắt đầu lớp
UPDATE diem_danh dd
JOIN lop_hoc lh ON lh.ma_lop = dd.ma_lop
SET dd.so_phut_di_tre = GREATEST(
    0,
    TIMESTAMPDIFF(
        MINUTE,
        CONCAT(DATE(dd.thoi_gian_diem_danh), ' ', lh.thoi_gian_bat_dau),
        dd.thoi_gian_diem_danh
    )
)
WHERE dd.so_phut_di_tre IS NULL;

UPDATE lich_su_diem_danh lsd
JOIN lop_hoc lh ON lh.ma_lop = lsd.ma_lop
SET lsd.so_phut_di_tre = GREATEST(
    0,
    TIMESTAMPDIFF(
        MINUTE,
        CONCAT(DATE(lsd.thoi_gian_diem_danh), ' ', lh.thoi_gian_bat_dau),
        lsd.thoi_gian_diem_danh
    )
)
WHERE lsd.so_phut_di_tre IS NULL;
