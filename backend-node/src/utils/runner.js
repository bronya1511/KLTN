// Ghi chu: chay FaceDetect -> Train; khong chan request
import { spawn } from "child_process";

// DUONG DAN THU MUC CHUA 2 FILE PY CUA BAN
const PY_DIR = "/home/thith/DA2";     // => doi neu khac
const FACE_DETECT = `${PY_DIR}/FaceDetect.py`;
const TRAIN       = `${PY_DIR}/Train.py`;

// chay python khong choi (detached)
function spawnBg(cmd, args, cwd) {
  const p = spawn(cmd, args, {
    cwd,
    env: { ...process.env },
    stdio: "ignore",
    detached: true,
  });
  p.unref();
  return p.pid;
}

// chay detect xong moi goi train (train chay nen)
export function runFaceThenTrain({ mssv, ho_ten = "" }) {
  // detect: KHONG detached de bat su kien close, nhung ta KHONG choi res
  const p = spawn("python3", [FACE_DETECT, mssv, ho_ten], {
    cwd: PY_DIR,
    env: { ...process.env },
  });

  // (tuy chon) log nhe ra console de de debug
  p.on("error", (e) => console.error("[FaceDetect] error:", e));
  p.on("close", (code) => {
    console.log(`[FaceDetect] exit ${code}; start Train...`);
    spawnBg("python3", [TRAIN], PY_DIR); // train chay nen
  });

  return { pid: p.pid };
}

// API khac muon goi thang Train (khong doi detect) thi dung ham nay
export function runTrainOnly() {
  const pid = spawnBg("python3", [TRAIN], PY_DIR);
  return { pid };
}
