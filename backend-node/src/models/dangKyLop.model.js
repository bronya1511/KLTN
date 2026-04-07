import { pool } from "../config/db.js";

export const DangKyLop = {
  async listByLop(ma_lop) {
    const [rows] = await pool.query(
      "SELECT ma_dang_ky, mssv, ma_lop, ngay_dang_ky, trang_thai FROM dang_ky_lop WHERE ma_lop=? ORDER BY ngay_dang_ky DESC",
      [ma_lop]
    );
    return rows;
  },

  async upsert({ mssv, ma_lop, trang_thai = "Da dang ky" }) {
    if (!mssv || !ma_lop) throw new Error("Thieu mssv hoac ma_lop");
    const [rows] = await pool.query(
      "SELECT ma_dang_ky FROM dang_ky_lop WHERE mssv=? AND ma_lop=? LIMIT 1",
      [mssv, ma_lop]
    );
    if (rows[0]) {
      await pool.query("UPDATE dang_ky_lop SET trang_thai=? WHERE ma_dang_ky=?", [trang_thai, rows[0].ma_dang_ky]);
      return { ma_dang_ky: rows[0].ma_dang_ky, mssv, ma_lop, trang_thai };
    }
    const [res] = await pool.query(
      "INSERT INTO dang_ky_lop (mssv, ma_lop, trang_thai, ngay_dang_ky) VALUES (?,?,?, NOW())",
      [mssv, ma_lop, trang_thai]
    );
    return { ma_dang_ky: res.insertId, mssv, ma_lop, trang_thai };
  },

  async remove(ma_dang_ky) {
    await pool.query("DELETE FROM dang_ky_lop WHERE ma_dang_ky=?", [ma_dang_ky]);
    return true;
  }
};
