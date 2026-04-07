import { spawn } from "child_process";
import path from "path";
import process from "process";
import dotenv from "dotenv";
dotenv.config();

const PY_BIN = process.env.PYTHON_BIN || "python3";
const PY_DIR = process.env.PYTHON_FACE_DIR || "../python-face";

/** spawn ti?n d?ng, kh�ng th?a k? TTY �? kh?i in r�c ^[[C */
function runPy(file, args = []) {
  return new Promise((resolve, reject) => {
    const log = [];
    const p = spawn(PY_BIN, [path.join(PY_DIR, file), ...args], {
      cwd: PY_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    p.stdout.on("data", (d) => log.push(d.toString()));
    p.stderr.on("data", (d) => log.push(d.toString()));
    p.on("error", reject);
    p.on("close", (code) => {
      code === 0 ? resolve(log.join("")) : reject(new Error(`Exit ${code}\n${log.join("")}`));
    });
  });
}

/**
 * Enroll g��ng m?t cho MSSV r?i train model.
 * @param {string} mssv
 * @param {number} soAnh  s? ?nh c?n ch?p
 * @param {number} camera ch? s? camera (m?c �?nh 0)
 */
export async function enrollAndTrain({ mssv, soAnh = 20, camera = 0 }) {
  if (!mssv) throw new Error("Thieu mssv");
  // T�y file FaceDetect.py/Train.py nh?n tham s? g? -> m?nh chu?n h�a:
  // --mssv <id> --num <so-anh> --camera <idx>
  const faceLog = await runPy("FaceDetect.py", ["--mssv", mssv, "--num", String(soAnh), "--camera", String(camera)]);
  const trainLog = await runPy("Train.py", []);
  return { faceLog, trainLog };
}
