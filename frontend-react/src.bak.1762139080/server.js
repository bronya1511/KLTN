import express from "express";
import cors from "cors";

import faceRouter from "./routes/face.routes.js";       // �? c� t? tr�?c
import sinhVienRouter from "./routes/sinh-vien.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// health
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// mount routes
app.use("/api/face", faceRouter);
app.use("/api/sinh-vien", sinhVienRouter);

// error -> tr? JSON (�? 500 tr?ng)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: err.message });
});

// start
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, HOST, () => {
  console.log(`Backend dang chay tai http://${HOST}:${PORT}`);
});
