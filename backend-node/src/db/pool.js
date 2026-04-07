import { pool } from "../config/db.js";

export async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export default pool;
