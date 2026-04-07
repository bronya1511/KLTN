import pool from "../db.js";

/** �?m t?ng theo t? kh�a (mssv/ho_ten) */
export async function count(keyword = "") {
  const kw = `%${keyword}%`;
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM sinh_vien
     WHERE (? = '' OR mssv LIKE ? OR ho_ten LIKE ?)`,
    [keyword, kw, kw]
  );
  return rows[0]?.total ?? 0;
}

/** Danh s�ch ph�n trang + t?m ki?m */
export async function list({ page = 1, limit = 20, keyword = "" } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 20);
  const offset = (p - 1) * l;
  const kw = `%${keyword}%`;
  const [rows] = await pool.query(
    `SELECT mssv, ho_ten, email, khoa, lop, nien_khoa
     FROM sinh_vien
     WHERE (? = '' OR mssv LIKE ? OR ho_ten LIKE ?)
     ORDER BY mssv DESC
     LIMIT ? OFFSET ?`,
    [keyword, kw, kw, l, offset]
  );
  return rows;
}

export async function get(mssv) {
  const [rows] = await pool.query(
    `SELECT mssv, ho_ten, email, khoa, lop, nien_khoa
     FROM sinh_vien WHERE mssv = ? LIMIT 1`,
    [mssv]
  );
  return rows[0] || null;
}

export async function create(data) {
  const { mssv, ho_ten, email, khoa, lop, nien_khoa } = data;
  await pool.query(
    `INSERT INTO sinh_vien (mssv, ho_ten, email, khoa, lop, nien_khoa)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [mssv, ho_ten, email, khoa, lop, nien_khoa]
  );
  return { mssv };
}

export async function update(mssv, data) {
  const fields = [];
  const params = [];
  ["ho_ten", "email", "khoa", "lop", "nien_khoa"].forEach((k) => {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(data[k]);
    }
  });
  if (!fields.length) return { affectedRows: 0 };
  params.push(mssv);
  const [rs] = await pool.query(
    `UPDATE sinh_vien SET ${fields.join(", ")} WHERE mssv = ?`,
    params
  );
  return rs;
}

export async function remove(mssv) {
  // B?n �? b?t ON DELETE CASCADE n�n x�a an to�n
  const [rs] = await pool.query(`DELETE FROM sinh_vien WHERE mssv = ?`, [mssv]);
  return rs;
}
