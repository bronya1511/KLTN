import { Router } from "express";
import bcrypt from "bcryptjs";
import { sign, auth } from "../middlewares/auth.js";
import { pool } from "../config/db.js";

const r = Router();

r.post("/login", async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const userKey = email || username;
    if (!userKey || !password) return res.status(400).json({ message: "Thieu tai khoan hoac mat khau" });

    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [userKey]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Sai tai khoan hoac mat khau" });
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ message: "Sai tai khoan hoac mat khau" });

    const token = sign({
      id: user.id,
      email: user.username,
      role: user.role,
      mssv: user.mssv,
      ma_giang_vien: user.ma_giang_vien
    });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mssv: user.mssv,
        ma_giang_vien: user.ma_giang_vien
      }
    });
  } catch (e) {
    return res.status(500).json({ message: String(e) });
  }
});

r.get("/me", auth(), (req, res) => {
  res.json({ user: req.user });
});

export default r;
