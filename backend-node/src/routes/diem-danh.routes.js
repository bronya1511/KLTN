import { Router } from "express";
import { diemDanhService } from "../services/diemDanh.service.js";
import { pythonFace } from "../integrations/python-face.client.js";

const r = Router();

r.post("/checkin", async (req, res, next) => {
  try {
    const result = await diemDanhService.checkinByFace(req.body || {});
    res.json({ ok: true, data: result });
  } catch (e) { next(e); }
});

r.post("/checkout", async (req, res, next) => {
  try {
    const result = await diemDanhService.checkoutByFace(req.body || {});
    res.json({ ok: true, data: result });
  } catch (e) { next(e); }
});

r.get("/auto", async (req, res, next) => {
  try {
    if (req.query.mssv) {
      const result = await diemDanhService.checkinByFace({
        mssv: req.query.mssv,
        ma_lop: req.query.ma_lop
      });
      return res.json({ ok: true, data: result, via: "manual" });
    }
    const data = await pythonFace.recognize();
    const fn = data?.action === "checkout" ? "checkoutByFace" : "checkinByFace";
    const result = await diemDanhService[fn](data || {});
    return res.json({ ok: true, data: result, via: "python-face" });
  } catch (e) { next(e); }
});

r.get("/logs", async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;
    const data = await diemDanhService.listLogs({ offset, limit });
    res.json({ ok: true, data, page, limit });
  } catch (e) { next(e); }
});

r.delete("/logs/:id", async (req, res, next) => {
  try {
    await diemDanhService.deleteLog(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
