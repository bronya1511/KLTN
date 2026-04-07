import { Router } from "express";
import { lopHocService } from "../services/lopHoc.service.js";
import { auth } from "../middlewares/auth.js";
import { pool } from "../config/db.js";

const r = Router();

r.get("/", auth(), async (req, res, next) => {
  try {
    const { keyword, page, limit } = req.query;
    const user = req.user || {};
    const opts = { keyword, page, limit };
    if (user.role === "giang_vien") opts.ma_giang_vien = user.ma_giang_vien;
    if (user.role === "sinh_vien") opts.mssv = user.mssv;
    res.json(await lopHocService.list(opts));
  } catch (e) { next(e); }
});

r.get("/:id", auth(), async (req, res, next) => {
  try { res.json(await lopHocService.get(req.params.id)); }
  catch (e) { next(e); }
});

r.post("/", auth(["admin"]), async (req, res, next) => {
  try { res.json(await lopHocService.create(req.body)); }
  catch (e) { next(e); }
});

r.put("/:id", auth(["admin"]), async (req, res, next) => {
  try { res.json(await lopHocService.update(req.params.id, req.body)); }
  catch (e) { next(e); }
});

r.delete("/:id", auth(["admin"]), async (req, res, next) => {
  try {
    const force = String(req.query.force || "").toLowerCase() === "true";
    res.json(await lopHocService.remove(req.params.id, { force }));
  }
  catch (e) { next(e); }
});

// Danh sách sinh viên trong lớp
r.get("/:id/students", auth(), async (req, res, next) => {
  try {
    const cls = await lopHocService.get(req.params.id);
    if (!cls) return res.status(404).json({ message: "Khong tim thay lop" });
    const user = req.user || {};
    if (user.role === "giang_vien" && cls.ma_giang_vien !== user.ma_giang_vien) {
      return res.status(403).json({ message: "Khong du quyen" });
    }
    if (user.role === "sinh_vien") {
      const [[found]] = await pool.query(
        "SELECT 1 FROM dang_ky_lop WHERE ma_lop=? AND mssv=? AND trang_thai='Da dang ky' LIMIT 1",
        [req.params.id, user.mssv]
      );
      if (!found) return res.status(403).json({ message: "Khong du quyen" });
    }
    res.json({ ok: true, data: await lopHocService.students(req.params.id) });
  } catch (e) { next(e); }
});

// Lịch sử điểm danh theo lớp (hỗ trợ export CSV)
r.get("/:id/attendance", auth(), async (req, res, next) => {
  try {
    const { page = 1, limit = 200, export: exportType } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const lim = Math.max(1, Math.min(500, Number(limit) || 200));
    const off = (p - 1) * lim;
    const cls = await lopHocService.get(req.params.id);
    if (!cls) return res.status(404).json({ message: "Khong tim thay lop" });
    const user = req.user || {};
    if (user.role === "giang_vien" && cls.ma_giang_vien !== user.ma_giang_vien) {
      return res.status(403).json({ message: "Khong du quyen" });
    }
    if (user.role === "sinh_vien") {
      const [[found]] = await pool.query(
        "SELECT 1 FROM dang_ky_lop WHERE ma_lop=? AND mssv=? AND trang_thai='Da dang ky' LIMIT 1",
        [req.params.id, user.mssv]
      );
      if (!found) return res.status(403).json({ message: "Khong du quyen" });
    }

    const data = await lopHocService.attendance(req.params.id, { limit: lim, offset: off });

    if (exportType === "csv") {
      const header = [
        "ma_lich_su",
        "mssv",
        "ho_ten",
        "ma_lop",
        "thoi_gian_diem_danh",
        "trang_thai_diem_danh",
        "ma_thiet_bi",
        "do_tin_cay",
        "so_phut_di_tre"
      ];
      const rows = data.map((r) =>
        header.map((k) => (r[k] !== null && r[k] !== undefined ? String(r[k]) : "")).join(",")
      );
      const csv = [header.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="attendance_${req.params.id}.csv"`
      );
      return res.send("\uFEFF" + csv);
    }

    res.json({ ok: true, data, page: p, limit: lim });
  } catch (e) { next(e); }
});

export default r;
