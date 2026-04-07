import { Router } from "express";
import pool from "../db.js";

const router = Router();

/** PUT: cap nhat thong tin sinh vien */
router.put("/sinh-vien/:mssv", async (req, res) => {
  try {
    const { mssv } = req.params;
    const { ho_ten = "", email = "", khoa_hoc = "" } = req.body || {};
    const [r] = await pool.execute(
      "UPDATE sinh_vien SET ho_ten=?, email=?, khoa_hoc=?, cap_nhat_luc=NOW() WHERE mssv=?",
      [ho_ten, email, khoa_hoc, mssv]
    );
    if (r.affectedRows === 0) return res.status(404).json({ ok:false, message:"Khong tim thay MSSV" });
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, message:String(e?.message || e) });
  }
});

/** DELETE: xoa sinh vien (xoa cung) */
router.delete("/sinh-vien/:mssv", async (req, res) => {
  try {
    const { mssv } = req.params;
    const [r] = await pool.execute("DELETE FROM sinh_vien WHERE mssv=?", [mssv]);
    if (r.affectedRows === 0) return res.status(404).json({ ok:false, message:"Khong tim thay MSSV" });
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, message:String(e?.message || e) });
  }
});

export default router;
