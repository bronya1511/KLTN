import axios from "axios";
import { env } from "../config/env.js";

function buildUrl() {
  const base = (env.PYTHON_SERVICE_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("PYTHON_SERVICE_URL chua duoc cau hinh");
  if (base.endsWith("/recognize")) return base;
  return `${base}/recognize`;
}

export const pythonFace = {
  async recognize() {
    const url = buildUrl();
    const headers = {};
    if (env.PYTHON_SERVICE_TOKEN) {
      headers["X-API-Key"] = env.PYTHON_SERVICE_TOKEN;
    }
    const { data } = await axios.get(url, { timeout: 15000, headers });
    return data;
  }
};
