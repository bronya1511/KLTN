import { diemDanhService } from "../services/diemDanh.service.js";
import { pythonFace } from "../integrations/python-face.client.js";

const INTERVAL_MS = Number(process.env.AUTO_FACE_INTERVAL_MS || 5000);
const COOLDOWN_MS = Number(process.env.AUTO_FACE_COOLDOWN_MS || 15000);

const lastSeen = new Map();
let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const data = await pythonFace.recognize();
    if (!data || !data.mssv) return;
    const now = Date.now();
    const key = `${data.mssv}-${data.action || "checkin"}`;
    if (now - (lastSeen.get(key) || 0) < COOLDOWN_MS) {
      return;
    }
    lastSeen.set(key, now);
    if (data.action === "checkout") {
      await diemDanhService.checkoutByFace(data);
    } else {
      await diemDanhService.checkinByFace(data);
    }
  } catch (err) {
    console.error("[autoRecognize]", err?.message || err);
  } finally {
    running = false;
  }
}

export function startAutoRecognizeJob() {
  if (process.env.AUTO_FACE_RECOGNIZE === "0") {
    console.log("[autoRecognize] Disabled via AUTO_FACE_RECOGNIZE=0");
    return;
  }
  if (timer) return;
  console.log(`[autoRecognize] Bat dau poll python-face moi ${INTERVAL_MS}ms`);
  timer = setInterval(tick, Math.max(INTERVAL_MS, 1000));
}
