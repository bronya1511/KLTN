// Ghi chu khong dau
// Wrapper fetch dung chung cho toan app

// BASE KHONG co /api o cuoi; path se bat dau bang /api
// Lấy BASE theo thứ tự ưu tiên:
// 1) VITE_API_BASE (không để đuôi /api, nếu có sẽ cắt)
//    - Nếu env đang là localhost/127 nhưng người dùng truy cập bằng IP máy chủ,
//      tự động ưu tiên window.location.origin để tránh bị fetch tới 127.0.0.1 trên máy client.
// 2) window.location.origin (phù hợp khi truy cập qua IP/http://192.168.x.x)
// 3) fallback 127.0.0.1:8080
const BASE = (() => {
  const isWindow = typeof window !== "undefined";
  const origin = isWindow ? window.location.origin : "";
  const envBase = (import.meta?.env?.VITE_API_BASE || "").replace(/\/+$/, "");
  const envIsLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envBase);

  // Nếu env trỏ tới loopback nhưng người dùng đang mở bằng IP/domain khác -> ưu tiên origin
  if (origin && envIsLoopback && !/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin.replace(/\/api$/, "");
  }

  // Ưu tiên env nếu có; nếu không -> origin; cuối cùng -> 127.0.0.1
  const raw = envBase || origin || "http://127.0.0.1:8080";
  return raw.replace(/\/api$/, "");
})();

// helper fetch co timeout de tranh treo
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...options });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// goi API: mac dinh ky vong JSON, neu backend tra HTML -> nem Error de thay ro nguyen nhan
function getToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("token") || null;
}

async function http(path, { method = "GET", headers = {}, body, accept = "application/json" } = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  console.log("[API]", method, url);
  const token = getToken();

  const res = await fetchWithTimeout(
    url,
    {
      method,
      headers: {
        Accept: accept,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body,
    },
    20000
  );

  const text = await res.text();
  const ct = res.headers.get("content-type") || "";

  let data = null;
  if (ct.includes("application/json")) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // neu co JSON -> lay message; neu khong -> cat HTML 200 ky tu de de debug
    const msg = (data && (data.message || data.error)) || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (accept.includes("application/json") && !ct.includes("application/json")) {
    throw new Error(`Khong phai JSON: ${text.slice(0, 200)}`);
  }

  return { data: data ?? text };
}

// public API: giong axios nhe
export const api = {
  get: (path, opt = {}) => http(path, { ...opt, method: "GET" }),

  post: (path, bodyObj = {}, opt = {}) =>
    http(path, {
      ...opt,
      method: "POST",
      headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
      body: JSON.stringify(bodyObj ?? {}),
    }),

  put: (path, bodyObj = {}, opt = {}) =>
    http(path, {
      ...opt,
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
      body: JSON.stringify(bodyObj ?? {}),
    }),

  delete: (path, opt = {}) => http(path, { ...opt, method: "DELETE" }),
};

export { BASE };
