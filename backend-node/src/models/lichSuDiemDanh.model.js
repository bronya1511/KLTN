import { pool } from "../config/db.js";

export const LichSuDiemDanh = {
  async listBySinhVien(sinh_vien_id, { offset = 0, limit = 50 }) {
    const [rows] = await pool.query(
      "SELECT * FROM lich_su_diem_danh WHERE sinh_vien_id=? ORDER BY id DESC LIMIT ? OFFSET ?",
      [sinh_vien_id, limit, offset]
    );
    return rows;
  }
};
