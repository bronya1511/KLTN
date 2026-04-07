import db from "../db.js";

export async function create({ mssv, ho_ten, email, khoa_hoc }) {
  await db.execute(
    "INSERT INTO sinh_vien(mssv, ho_ten, email, khoa_hoc) VALUES(?,?,?,?)",
    [mssv, ho_ten, email, khoa_hoc]
  );
  return { mssv };
}

export async function list({ page = 1, limit = 50, keyword = "" }) {
  const offset = (Number(page) - 1) * Number(limit);
  const kw = `%${keyword}%`;

  const [rows] = await db.execute(
    `SELECT mssv, ho_ten, email, khoa_hoc
       FROM sinh_vien
      WHERE mssv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR khoa_hoc LIKE ?
      ORDER BY mssv
      LIMIT ? OFFSET ?`,
    [kw, kw, kw, kw, Number(limit), Number(offset)]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM sinh_vien
      WHERE mssv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR khoa_hoc LIKE ?`,
    [kw, kw, kw, kw]
  );

  return { rows, total, page: Number(page), limit: Number(limit) };
}

export async function countAll() {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM sinh_vien`);
  return total;
}
