import { Router } from "express";
import * as sinhVienService from "../services/sinhVien.service.js";

const router = Router();

// GET /api/sinh-vien?page=&limit=&keyword=
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 50, keyword = "" } = req.query;
    const data = await sinhVienService.list({ page, limit, keyword });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

// POST /api/sinh-vien
router.post("/", async (req, res, next) => {
  try {
    const { mssv, ho_ten, email, khoa_hoc } = req.body || {};
    if (!mssv) return res.status(400).json({ ok: false, message: "Missing mssv" });

    const created = await sinhVienService.create({ mssv, ho_ten, email, khoa_hoc });
    res.status(201).json({ ok: true, created });
  } catch (err) {
    next(err);
  }
});

export default router;
