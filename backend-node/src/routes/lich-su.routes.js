import { Router } from "express";
import { q } from "../db/pool.js";

const router = Router();

/**
 * GET /api/lich-su?page=1&limit=20&keyword=...
 * Tr?: { items, page, limit, total }
 */
router.get("/", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? "20", 10)));
    const kw    = (req.query.keyword ?? "").trim();
    const off   = (page - 1) * limit;

    const where = kw ? "WHERE sv.ho_ten LIKE ? OR ls.mssv LIKE ?" : "";
    const args  = kw ? [`%${kw}%`, `%${kw}%`] : [];

    const totalRows = await q(
      `SELECT COUNT(*) AS c
         FROM lich_su_diem_danh ls
         LEFT JOIN sinh_vien sv ON sv.mssv = ls.mssv
         ${where}`,
      args
    );
    const total = totalRows[0]?.c ?? 0;

    const items = await q(
      `SELECT
         ls.ma_lich_su      AS id,
         ls.mssv,
         sv.ho_ten,
         ls.thoi_gian_diem_danh AS thoi_gian,
         ls.trang_thai_diem_danh AS trang_thai,
         ls.ma_thiet_bi     AS thiet_bi
       FROM lich_su_diem_danh ls
       LEFT JOIN sinh_vien sv ON sv.mssv = ls.mssv
       ${where}
       ORDER BY ls.thoi_gian_diem_danh DESC
       LIMIT ? OFFSET ?`,
      kw ? [...args, limit, off] : [limit, off]
    );

    res.json({ items, page, limit, total });
  } catch (err) {
    console.error("GET /api/lich-su error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;
