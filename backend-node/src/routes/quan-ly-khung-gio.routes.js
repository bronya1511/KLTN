import { Router } from "express";
import { khungGioService } from "../services/khungGio.service.js";

const r = Router();

r.get("/", async (_req, res, next) => {
  try { res.json(await khungGioService.list()); }
  catch (e) { next(e); }
});

r.put("/:lop_id", async (req, res, next) => {
  try {
    const { thoi_gian_bat_dau, thoi_gian_ket_thuc, thu } = req.body;
    res.json(await khungGioService.setKhungGio(req.params.lop_id, {
      thoi_gian_bat_dau, thoi_gian_ket_thuc, thu
    }));
  } catch (e) { next(e); }
});

export default r;
