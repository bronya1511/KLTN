import { pool } from "../config/db.js";

export const DiemDanh = {
  async logList({ offset = 0, limit = 50 }) {
    const off = Math.max(0, Number(offset) || 0);
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const [rows] = await pool.query(
      `SELECT
         lsd.ma_lich_su      AS ma_lich_su,
         lsd.mssv            AS mssv,
         lsd.ho_ten          AS ho_ten,
         lsd.ma_lop          AS ma_lop,
         lsd.trang_thai_diem_danh AS trang_thai_diem_danh,
         lsd.thoi_gian_diem_danh  AS thoi_gian_diem_danh,
         lsd.ma_thiet_bi     AS ma_thiet_bi,
         lsd.do_tin_cay      AS do_tin_cay
       FROM lich_su_diem_danh lsd
       ORDER BY lsd.thoi_gian_diem_danh DESC
       LIMIT ? OFFSET ?`,
      [lim, off]
    );
    return rows;
  },

  async deleteLog(ma_lich_su) {
    const id = Number(ma_lich_su);
    if (!id) return { affectedRows: 0 };
    const [res] = await pool.query("DELETE FROM lich_su_diem_danh WHERE ma_lich_su=?", [id]);
    // Không reset AUTO_INCREMENT nữa
    return res;
  },

  async checkin({
    mssv,
    ma_lop,
    thoi_gian_diem_danh,
    ma_thiet_bi = "pi5-cam-01",
    do_tin_cay = null,
    so_phut_di_tre = null,
    trang_thai = "Hop le"
  }) {
    const [res] = await pool.query(
      `INSERT INTO diem_danh (
        mssv, ma_lop, thoi_gian_diem_danh, ma_thiet_bi,
        do_tin_cay, so_phut_di_tre, nguon_nhan_dien, trang_thai
      ) VALUES (?,?,?,?,?,?,'face',?)`,
      [
        mssv,
        ma_lop,
        thoi_gian_diem_danh,
        ma_thiet_bi,
        do_tin_cay,
        so_phut_di_tre,
        trang_thai
      ]
    );
    return res.insertId;
  }
};
