import { Router } from "express";
import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";

const r = Router();

// Đồng bộ tài khoản đăng nhập cho giảng viên (bảng users)
async function syncTeacherUser({ username, password, ma_giang_vien }) {
  const uname = username || ma_giang_vien;
  if (!uname || !ma_giang_vien) return;

  // Tìm user theo ma_giang_vien hoặc username
  const [rows] = await pool.query("SELECT id FROM users WHERE ma_giang_vien=? OR username=?", [ma_giang_vien, uname]);
  const hasPassword = password !== undefined; // cho phép không đổi pass nếu không gửi lên
  const hash = hasPassword ? await bcrypt.hash(password || "123", 10) : null;

  if (rows[0]) {
    const id = rows[0].id;
    const sets = ["username=?", "role='giang_vien'", "ma_giang_vien=?"];
    const params = [uname, ma_giang_vien];
    if (hasPassword) {
      sets.push("password_hash=?");
      params.push(hash);
    }
    params.push(id);
    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=?`, params);
  } else {
    const insertHash = hasPassword ? hash : await bcrypt.hash("123", 10);
    await pool.query(
      "INSERT INTO users (username, password_hash, role, ma_giang_vien) VALUES (?, ?, 'giang_vien', ?)",
      [uname, insertHash, ma_giang_vien]
    );
  }
}

r.get("/", async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "50", 10)));
    const offset = (page - 1) * limit;
    const kw = (req.query.keyword || "").trim();
    const where = kw ? "WHERE ma_giang_vien LIKE ? OR ho_ten LIKE ? OR email LIKE ?" : "";
    const args = kw ? [`%${kw}%`, `%${kw}%`, `%${kw}%`, limit, offset] : [limit, offset];

    const [rows] = await pool.query(
      `SELECT ma_giang_vien, ho_ten, email, so_dien_thoai, tai_khoan
         FROM giang_vien
         ${where}
         ORDER BY ma_giang_vien ASC
         LIMIT ? OFFSET ?`,
      args
    );
    const [tot] = await pool.query(
      `SELECT COUNT(*) AS c FROM giang_vien ${kw ? "WHERE ma_giang_vien LIKE ? OR ho_ten LIKE ? OR email LIKE ?" : ""}`,
      kw ? [`%${kw}%`, `%${kw}%`, `%${kw}%`] : []
    );
    res.json({ ok: true, data: rows, page, limit, total: tot[0].c });
  } catch (e) { next(e); }
});

r.post("/", async (req, res, next) => {
  try {
    const { ma_giang_vien, ho_ten, email = null, so_dien_thoai = null, mat_khau = "", tai_khoan = null } = req.body || {};
    if (!ma_giang_vien || !ho_ten) return res.status(400).json({ ok: false, message: "Thieu ma_giang_vien hoac ho_ten" });
    await pool.query(
      "INSERT INTO giang_vien (ma_giang_vien, ho_ten, email, so_dien_thoai, mat_khau, tai_khoan) VALUES (?,?,?,?,?,?)",
      [ma_giang_vien, ho_ten, email, so_dien_thoai, mat_khau, tai_khoan]
    );
    await syncTeacherUser({ username: tai_khoan || ma_giang_vien, password: mat_khau, ma_giang_vien });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ho_ten, email, so_dien_thoai, mat_khau, tai_khoan } = req.body || {};
    const sets = [];
    const args = [];
    if (ho_ten !== undefined) { sets.push("ho_ten=?"); args.push(ho_ten); }
    if (email !== undefined) { sets.push("email=?"); args.push(email); }
    if (so_dien_thoai !== undefined) { sets.push("so_dien_thoai=?"); args.push(so_dien_thoai); }
    if (mat_khau !== undefined) { sets.push("mat_khau=?"); args.push(mat_khau); }
    if (tai_khoan !== undefined) { sets.push("tai_khoan=?"); args.push(tai_khoan); }
    if (!sets.length) return res.json({ ok: true, message: "No changes" });
    args.push(id);
    const [r] = await pool.query(`UPDATE giang_vien SET ${sets.join(", ")} WHERE ma_giang_vien=?`, args);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "Khong tim thay giang vien" });
    await syncTeacherUser({ username: tai_khoan, password: mat_khau, ma_giang_vien: id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [r] = await pool.query("DELETE FROM giang_vien WHERE ma_giang_vien=?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "Khong tim thay giang vien" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
