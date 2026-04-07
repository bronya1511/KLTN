// src/lib/api.js
// Tien ich goi API cho React (Vite)

// Canh bao: KHONG hardcode 127.0.0.1 o day
// Dat VITE_API_BASE trong .env neu backend chay o may khac
// Neu khong dat, mac dinh dung duong dan tuong doi "/api" de di qua Vite proxy

const RAW_BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || "/api";

// Bo dau / thua o cuoi
export const BASE = String(RAW_BASE).replace(/\/+$/, "");

// Ghep URL an toan, ho tro query object
export function buildUrl(path, query) {
  // Neu path la http(s) thi giu nguyen
  const base =
    /^https?:\/\//i.test(path)
      ? ""
      : path.startsWith("/")
      ? BASE
      : `${BASE}`;

  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`, window.location.origin);

  if (query && typeof query === "object") {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      // Cho phep array
      if (Array.isArray(v)) {
        v.forEach((item) => params.append(k, String(item)));
      } else {
        params.append(k, String(v));
      }
    }
    const qs = params.toString();
    if (qs) url.search = qs;
  }
  return url.toString().replace(window.location.origin, "");
}

// Mac dinh 15s timeout
const DEFAULT_TIMEOUT_MS = 15000;

// Ham core goi fetch, tu dong set header JSON neu gui object
export async function fetchJSON(path, options = {}) {
  const {
    method = "GET",
    query,
    data,
    headers,
    timeout = DEFAULT_TIMEOUT_MS,
    signal,
    // ...con lai de nguyen cho fetch
    ...rest
  } = options;

  const url = buildUrl(path, query);

  const finalHeaders = new Headers(headers || {});
  let body = rest.body;

  // Tu dong chuyen data -> JSON neu khong phai FormData/Blob
  if (data !== undefined && data !== null && body === undefined) {
    if (data instanceof FormData || data instanceof Blob) {
      body = data; // Browser tu set Content-Type voi FormData/Blob
    } else {
      finalHeaders.set("Content-Type", "application/json");
      body = JSON.stringify(data);
    }
  }

  // AbortController cho timeout
  const controller = new AbortController();
  const timeoutId =
    timeout > 0
      ? setTimeout(() => controller.abort(new Error("Request timeout")), timeout)
      : null;

  // Gop signal ben ngoai (neu co)
  const linkedSignal = mergeSignals(signal, controller.signal);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body,
      signal: linkedSignal,
      // Cho phep override boi rest
      ...rest,
    });
  } catch (err) {
    // Net error, DNS, refused, CORS preflight fail, bi block, ...
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`Fetch failed: ${msg}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  // Convert response
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    // Lay noi dung loi de debug
    let errBody = "";
    try {
      errBody = isJson ? JSON.stringify(await res.json()) : await res.text();
    } catch (_) {
      // bo qua
    }
    const statusText = res.statusText || "HTTP Error";
    throw new Error(`HTTP ${res.status} ${statusText} - ${errBody}`);
  }

  return isJson ? res.json() : res.text();
}

// Nhom tien ich REST
export const api = {
  get: (path, opts = {}) => fetchJSON(path, { ...opts, method: "GET" }),
  post: (path, data, opts = {}) =>
    fetchJSON(path, { ...opts, method: "POST", data }),
  put: (path, data, opts = {}) =>
    fetchJSON(path, { ...opts, method: "PUT", data }),
  patch: (path, data, opts = {}) =>
    fetchJSON(path, { ...opts, method: "PATCH", data }),
  delete: (path, opts = {}) => fetchJSON(path, { ...opts, method: "DELETE" }),
};

// Tien ich noi signal lai voi AbortController khac
function mergeSignals(extSignal, controllerSignal) {
  if (!extSignal) return controllerSignal;
  if (extSignal.aborted) return extSignal;

  const ctrl = new AbortController();

  const onAbort = () => ctrl.abort(extSignal.reason);
  const onAbort2 = () => ctrl.abort(controllerSignal.reason);

  extSignal.addEventListener("abort", onAbort, { once: true });
  controllerSignal.addEventListener("abort", onAbort2, { once: true });

  // Hack: tra ve signal moi va clean listener khi aborted
  const cleanup = () => {
    extSignal.removeEventListener("abort", onAbort);
    controllerSignal.removeEventListener("abort", onAbort2);
  };
  ctrl.signal.addEventListener("abort", cleanup, { once: true });

  return ctrl.signal;
}

/*
Huong dan su dung nhanh:

1) Dev qua Vite proxy (khuyen nghi):
   - Khong dat VITE_API_BASE
   - vite.config.ts:
       server: { proxy: { "/api": { target: "http://<IP-backend>:8080", changeOrigin: true } } }
   - Goi: api.get("/students", { query: { limit: 20, keyword: "A" } })

2) Ket noi truc tiep backend:
   - .env.local: VITE_API_BASE=http://<IP-backend>:8080/api
   - Goi giong nhu tren

3) Xu ly loi:
   try { await api.get("/health") } catch (e) { setErr(String(e)) }
*/
