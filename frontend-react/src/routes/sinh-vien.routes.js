// src/routes/sinh-vien.routes.js
import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ping de kiem tra router mount
router.get("/ping", (req, res) => {
  res.json({ ok: true, route: "/api/sinh-vien" });
});

/**
 * GET /api/sinh-vien?page=&limit=&keyword=
 * Tra ve: { items, page, limit, total }
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "20", 10)));
    const kw = (req.query.keyword || "").trim();
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (kw) {
      where.push("(mssv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR khoa_hoc LIKE ?)");
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // KHONG dung ? cho LIMIT/OFFSET -> noi truc tiep offset, limit da an toan (so nguyen da validate)
    const listSql = `
      SELECT mssv, ho_ten, email, khoa_hoc
      FROM sinh_vien
      ${whereSql}
      ORDER BY mssv ASC
      LIMIT ${offset}, ${limit}
    `;
    const [rows] = await pool.query(listSql, params);

    const countSql = `SELECT COUNT(*) AS total FROM sinh_vien ${whereSql}`;
    const [[countRow]] = await pool.query(countSql, params);

    res.json({ items: rows, page, limit, total: countRow.total || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

/**
 * POST /api/sinh-vien
 * Body: { mssv, ho_ten, email, khoa_hoc }
 */
router.post("/", async (req, res) => {
  try {
    const { mssv, ho_ten, email, khoa_hoc } = req.body || {};
    if (!mssv || !ho_ten) {
      return res.status(400).json({ ok: false, message: "mssv va ho_ten la bat buoc" });
    }
    await pool.query(
      `INSERT INTO sinh_vien (mssv, ho_ten, email, khoa_hoc) VALUES (?,?,?,?)`,
      [mssv, ho_ten || "", email || "", khoa_hoc || ""]
    );
    res.json({ ok: true, mssv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

/**
 * PUT /api/sinh-vien/:mssv
 * Body: { ho_ten?, email?, khoa_hoc? }
 */
router.put("/:mssv", async (req, res) => {
  try {
    const { mssv } = req.params;
    const { ho_ten, email, khoa_hoc } = req.body || {};

    const [ret] = await pool.query(
      `UPDATE sinh_vien
       SET ho_ten = COALESCE(?, ho_ten),
           email = COALESCE(?, email),
           khoa_hoc = COALESCE(?, khoa_hoc)
       WHERE mssv = ?`,
      [ho_ten ?? null, email ?? null, khoa_hoc ?? null, mssv]
    );

    if (ret.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Khong tim thay sinh vien" });
    }
    res.json({ ok: true, mssv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

/**
 * DELETE /api/sinh-vien/:mssv
 */
router.delete("/:mssv", async (req, res) => {
  try {
    const { mssv } = req.params;
    const [ret] = await pool.query(`DELETE FROM sinh_vien WHERE mssv = ?`, [mssv]);
    if (ret.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Khong tim thay sinh vien" });
    }
    res.json({ ok: true, mssv });
  } catch (e) {
    // neu dinh FK (vi du bang diem_danh), MySQL se nem loi -> tra thong diep ro rang
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

export default router;
