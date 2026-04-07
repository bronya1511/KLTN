import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import process from "process";
import { env } from "../config/env.js";
import fs from "fs";

const router = Router();
let recognizeProc = null;
const SNAPSHOT_PATH =
  process.env.SNAPSHOT_PATH ||
  path.join(process.cwd(), "../python-face/out/snapshot.jpg");

function tail(txt = "", lines = 60) {
  const arr = (txt || "").split(/\r?\n/);
  return arr.slice(Math.max(0, arr.length - lines)).join("\n");
}

function hasImages(dir) {
  try {
    const exts = [".jpg", ".jpeg", ".png", ".bmp"];
    return fs.readdirSync(dir).some((f) => exts.some((ext) => f.toLowerCase().endsWith(ext)));
  } catch {
    return false;
  }
}

function runCmd(cmd, args = [], { cwd, timeout = 60000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    let killedByTimeout = false;
    const to = setTimeout(() => {
      killedByTimeout = true;
      try { child.kill("SIGKILL"); } catch {}
    }, timeout);

    child.on("close", (code) => {
      clearTimeout(to);
      resolve({ code, stdout, stderr, killedByTimeout });
    });
  });
}

router.get("/ping", (_req, res) => {
  res.json({ ok: true, at: Date.now() });
});

// Serve latest snapshot (được ghi bởi Recognize.py)
router.get("/snapshot", (_req, res) => {
  try {
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      return res.status(404).send("snapshot not found");
    }
    res.setHeader("Cache-Control", "no-store");
    return res.sendFile(SNAPSHOT_PATH);
  } catch (e) {
    return res.status(500).send(String(e));
  }
});

router.post("/enroll", async (req, res) => {
  try {
    const { mssv, soAnh = 8, camera = 0 } = req.body || {}; // tăng mặc định số ảnh để enroll ổn định hơn
    if (!mssv) return res.status(400).json({ ok: false, message: "Thieu mssv" });

    const PYDIR =
      process.env.PYTHON_FACE_DIR ||
      path.join(process.cwd(), "../python-face");
    const DATASET_DIR = path.join(PYDIR, "dataset", String(mssv));

    // Dọn tiến trình cũ giữ camera (nếu có)
    await runCmd("bash", ["-lc", "pkill -f 'FaceDetect.py' || true; pkill -f libcamera || true"], { timeout: 5000 });

    // Bước 1: nếu dataset đã có ảnh -> bỏ qua chụp; nếu chưa có -> dùng register_face.py để chụp nhanh
    let detect = { code: 0, stdout: "", stderr: "" };
    if (!hasImages(DATASET_DIR)) {
      detect = await runCmd(
        "python3",
        ["-u", "register_face.py", String(mssv), "--folder", "dataset", "--camera", String(camera), "--num", String(soAnh)],
        { cwd: PYDIR, timeout: 90_000 } // 90s cho chụp
      );

      if (detect.code !== 0) {
        return res.status(500).json({
          ok: false,
          step: "detect",
          message: `Exit ${detect.code}${detect.killedByTimeout ? " (timeout)" : ""}`,
          stdout: tail(detect.stdout, 80),
          stderr: tail(detect.stderr, 80),
        });
      }
    }

    // Bước 2: train
    const train = await runCmd("python3", ["-u", "Train.py"], {
      cwd: PYDIR,
      timeout: 180_000, // 3 ph�t cho train
    });

    if (train.code !== 0) {
      return res.status(500).json({
        ok: false,
        step: "train",
        message: `Exit ${train.code}${train.killedByTimeout ? " (timeout)" : ""}`,
        stdout: tail(train.stdout, 80),
        stderr: tail(train.stderr, 80),
      });
    }

    return res.json({
      ok: true,
      step: "done",
      detectTail: tail(detect.stdout, 80),
      trainTail: tail(train.stdout, 80),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: String(err?.stack || err) });
  }
});

// Start continuous Recognize.py
router.post("/recognize/start", async (req, res) => {
  try {
    const classCode =
      req.body?.classCode ||
      req.body?.ma_lop ||
      req.body?.lop ||
      "";
    const forceOpenCV = process.env.FACE_FORCE_OPENCV === "1" || !!req.body?.useOpenCV;
    const videoSource = req.body?.videoSource || process.env.FACE_VIDEO_SOURCE || "";
    const cameraIndex = req.body?.cameraIndex ?? process.env.FACE_CAMERA_INDEX ?? "";
    const camWidth = req.body?.width || process.env.FACE_FRAME_WIDTH || "";
    const camHeight = req.body?.height || process.env.FACE_FRAME_HEIGHT || "";

    if (recognizeProc && recognizeProc.exitCode === null) {
      return res.json({ ok: true, running: true, message: "Recognizer dang chay" });
    }
    const PYDIR = process.env.PYTHON_FACE_DIR || path.join(process.cwd(), "../python-face");
    const backendBase = `http://127.0.0.1:${env.PORT}/api`;
    const args = ["-u", "Recognize.py"];
    if (classCode) {
      args.push("--class-code", String(classCode));
    }
    // Ưu tiên USB webcam/OpenCV: mặc định bật --use-opencv nếu không có videoSource
    // Ưu tiên OpenCV nếu được yêu cầu, hoặc khi không có videoSource (USB cam)
    if (forceOpenCV || !videoSource) {
      args.push("--use-opencv");
    }
    if (videoSource) {
      args.push("--video-source", String(videoSource));
    }
    if (cameraIndex !== "") {
      args.push("--camera-index", String(cameraIndex));
    }
    if (camWidth) {
      args.push("--width", String(camWidth));
    }
    if (camHeight) {
      args.push("--height", String(camHeight));
    }

    recognizeProc = spawn("python3", args, {
      cwd: PYDIR,
      env: {
        ...process.env,
        BACKEND_API_BASE: backendBase,
        FACE_CLASS_CODE: classCode || process.env.FACE_CLASS_CODE || "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    recognizeProc.stdout.on("data", (d) => console.log(`[Recognize] ${String(d).trim()}`));
    recognizeProc.stderr.on("data", (d) => console.error(`[Recognize-ERR] ${String(d).trim()}`));
    recognizeProc.on("close", (code) => {
      console.log(`[Recognize] exit ${code}`);
      recognizeProc = null;
    });
    return res.json({ ok: true, running: true, message: "Da khoi dong Recognize.py", classCode });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: String(e) });
  }
});

router.post("/recognize/stop", async (_req, res) => {
  try {
    if (recognizeProc && recognizeProc.exitCode === null) {
      recognizeProc.kill("SIGTERM");
      recognizeProc = null;
      return res.json({ ok: true, running: false, message: "Da dung Recognize.py" });
    }
    return res.json({ ok: true, running: false, message: "Khong co tien trinh Recognize dang chay" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: String(e) });
  }
});

router.get("/recognize/status", (_req, res) => {
  const running = !!recognizeProc && recognizeProc.exitCode === null;
  res.json({ ok: true, running });
});

export default router;
