import { spawn } from "node:child_process";
import path from "node:path";

function runPy(scriptPath, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...opts.env },
      cwd: opts.cwd || path.dirname(scriptPath),
    });

    proc.stdout.on("data", d => console.log(`[PY] ${String(d).trim()}`));
    proc.stderr.on("data", d => console.error(`[PY-ERR] ${String(d).trim()}`));

    proc.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exit ${code}`));
    });
  });
}

export async function runEnrollThenTrain(mssv, soAnh = 3) {
  const faceDetect = "/home/thith/DA2/python-face/FaceDetect.py";
  const train = "/home/thith/DA2/python-face/Train.py";

  // N?u th�?ng b? camera �ang b?n, c� th? "d?n" nhanh:
  // spawn("bash", ["-lc", "pkill -f libcamera || true; pkill -f FaceDetect.py || true"]);

  await runPy(faceDetect, ["--mssv", mssv, "--soAnh", String(soAnh)]);
  await runPy(train, []);
}
