import { pool } from "../db.js";

export async function findLichSu({ page = 1, limit = 20, keyword = "" }) {
  page  = Math.max(parseInt(page)  || 1, 1);
  limit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);
  const offset = (page - 1) * limit;

  // T?m theo mssv / h? t�n (t�y ?)
  const kw = (keyword || "").trim();
  const where = [];
  const params = [];

  if (kw) {
    where.push("(ls.mssv LIKE ? OR sv.ho_ten LIKE ?)");
    params.push(`%${kw}%`, `%${kw}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // CAST sang CHAR �? tr�nh l?i JSON v?i s? c� 0 ? �?u
  const sqlData = `
    SELECT
      CAST(ls.ma_lich_su AS CHAR)          AS ma_lich_su,
      CAST(ls.mssv       AS CHAR)          AS mssv,
      sv.ho_ten,
      DATE_FORMAT(ls.thoi_gian, '%Y-%m-%dT%H:%i:%sZ') AS thoi_gian,
      ls.trang_thai,
      CAST(ls.ma_thiet_bi AS CHAR)         AS ma_thiet_bi
    FROM lich_su_diem_danh ls
    JOIN sinh_vien sv ON sv.mssv = ls.mssv
    ${whereSql}
    ORDER BY ls.thoi_gian DESC
    LIMIT ? OFFSET ?;
  `;
  const sqlCount = `
    SELECT COUNT(*) AS total
    FROM lich_su_diem_danh ls
    JOIN sinh_vien sv ON sv.mssv = ls.mssv
    ${whereSql};
  `;

  const [rows]  = await pool.query(sqlData,  [...params, limit, offset]);
  const [count] = await pool.query(sqlCount, params);

  return { page, limit, total: count[0]?.total ?? 0, items: rows };
}
