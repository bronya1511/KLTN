import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./middlewares/error.js";
import authRoutes from "./routes/auth.routes.js";
import sinhVienRoutes from "./routes/sinh-vien.routes.js";
import lopHocRoutes from "./routes/lop-hoc.routes.js";
import dangKyLopRoutes from "./routes/dang-ky-lop.routes.js";
import diemDanhRoutes from "./routes/diem-danh.routes.js";
import khungGioRoutes from "./routes/quan-ly-khung-gio.routes.js";
import faceRoutes from "./routes/face.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import giangVienRoutes from "./routes/giang-vien.routes.js";

const app = express();
app.set("etag", false);
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/sinh-vien", sinhVienRoutes);
app.use("/api/lop-hoc", lopHocRoutes);
app.use("/api/dang-ky-lop", dangKyLopRoutes);
app.use("/api/diem-danh", diemDanhRoutes);
app.use("/api/quan-ly-khung-gio", khungGioRoutes);
app.use("/api/giang-vien", giangVienRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/face", faceRoutes);

app.use(errorHandler);

export default app;
