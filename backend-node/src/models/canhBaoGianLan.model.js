import { pool } from "../config/db.js";

export const CanhBaoGianLan = {
  async list({ offset = 0, limit = 50 }) {
    const [rows] = await pool.query(
      "SELECT * FROM canh_bao_gian_lan ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    return rows;
  }
};
