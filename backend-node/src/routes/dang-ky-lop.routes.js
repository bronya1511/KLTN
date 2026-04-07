import { Router } from "express";
import { DangKyLop } from "../models/dangKyLop.model.js";
import { auth } from "../middlewares/auth.js";
import { pool } from "../config/db.js";

const r = Router();

r.get("/:ma_lop", auth(), async (req, res, next) => {
  try {
    const ma_lop = req.params.ma_lop;
    const user = req.user || {};
    if (user.role === "giang_vien") {
      const [[cls]] = await pool.query("SELECT ma_lop FROM lop_hoc WHERE ma_lop=? AND ma_giang_vien=? LIMIT 1", [ma_lop, user.ma_giang_vien]);
      if (!cls) return res.status(403).json({ message: "Khong du quyen" });
    }
    if (user.role === "sinh_vien") {
      const [[found]] = await pool.query(
        "SELECT 1 FROM dang_ky_lop WHERE ma_lop=? AND mssv=? AND trang_thai='Da dang ky' LIMIT 1",
        [ma_lop, user.mssv]
      );
      if (!found) return res.status(403).json({ message: "Khong du quyen" });
    }
    res.json({ ok: true, data: await DangKyLop.listByLop(ma_lop) });
  } catch (e) { next(e); }
});

r.post("/", auth(), async (req, res, next) => {
  try {
    const { ma_lop, mssv } = req.body || {};
    const user = req.user || {};
    if (!ma_lop || !mssv) return res.status(400).json({ message: "ma_lop va mssv bat buoc" });
    if (user.role === "sinh_vien" && user.mssv !== mssv) {
      return res.status(403).json({ message: "Chi duoc dang ky cho chinh minh" });
    }
    if (user.role === "giang_vien") {
      const [[cls]] = await pool.query("SELECT ma_lop FROM lop_hoc WHERE ma_lop=? AND ma_giang_vien=? LIMIT 1", [ma_lop, user.ma_giang_vien]);
      if (!cls) return res.status(403).json({ message: "Khong du quyen" });
    }
    const data = await DangKyLop.upsert(req.body);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

r.delete("/:ma_dang_ky", auth(["admin"]), async (req, res, next) => {
  try { res.json({ ok: true, data: await DangKyLop.remove(req.params.ma_dang_ky) }); }
  catch (e) { next(e); }
});

export default r;
