import { Router } from "express";
import { pool } from "../config/db.js";

const r = Router();

// Them/xoa/sua chung cho bat ky bang (can tham so tro an toan, chi dung o admin UI)
r.post("/crud", async (req, res, next) => {
  try {
    const { table, action, data, id } = req.body;
    if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Ten bang khong hop le");
    if (action === "create") {
      const [ret] = await pool.query(`INSERT INTO ${table} SET ?`, [data]);
      return res.json({ id: ret.insertId, ...data });
    }
    if (action === "update") {
      await pool.query(`UPDATE ${table} SET ? WHERE id=?`, [data, id]);
      return res.json({ id, ...data });
    }
    if (action === "delete") {
      await pool.query(`DELETE FROM ${table} WHERE id=?`, [id]);
      return res.json({ ok: true });
    }
    res.status(400).json({ message: "Action khong ho tro" });
  } catch (e) { next(e); }
});

export default r;
