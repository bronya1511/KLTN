import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(requiredRoles) {
  const roles = requiredRoles
    ? Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles]
    : null;

  return (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) return res.status(401).json({ message: "Chua dang nhap" });
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.user = payload;
      if (roles && !roles.includes(payload.role)) {
        return res.status(403).json({ message: "Khong du quyen" });
      }
      next();
    } catch (e) {
      return res.status(401).json({ message: "Token khong hop le" });
    }
  };
}

export function sign(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "admin",
      mssv: user.mssv || null,
      ma_giang_vien: user.ma_giang_vien || null
    },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
