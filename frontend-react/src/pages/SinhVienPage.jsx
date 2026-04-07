// src/pages/SinhVienList.jsx
// Ghi chu khong dau

import React, { useEffect, useMemo, useState } from "react";

const API = (import.meta.env && import.meta.env.VITE_API_BASE) ;

// Helper goi API: tra JSON, neu server tra HTML/404 thi thong bao ro
async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${res.status}] ${res.statusText}: ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Khong phai JSON: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

export default function SinhVienList() {
  // form them moi
  const [mssv, setMssv] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [email, setEmail] = useState("");
  const [khoaHoc, setKhoaHoc] = useState("");

  // list + tim kiem + trang
  const [items, setItems] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const limit = 20;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total]
  );

  // tai danh sach
  async function fetchList(p = 1, kw = "") {
    try {
      setError("");
      setLoading(true);
      const url = `${API}/sinh-vien?page=${p}&limit=${limit}&keyword=${encodeURIComponent(
        kw
      )}`;
      const data = await httpJson(url);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList(1, keyword);
  }, []);

  // them moi (muc tieu: luu thong tin sv; neu ben ban co nut enroll+train rieng thi lam ben khac)
  async function handleCreate(e) {
    e.preventDefault();
    try {
      setError("");
      await httpJson(`${API}/sinh-vien`, {
        method: "POST",
        body: JSON.stringify({
          mssv: mssv.trim(),
          ho_ten: hoTen.trim(),
          email: email.trim(),
          khoa_hoc: khoaHoc.trim(),
        }),
      });
      setMssv("");
      setHoTen("");
      setEmail("");
      setKhoaHoc("");
      await fetchList(1, keyword);
    } catch (e) {
      setError(String(e));
    }
  }

  // luu sua 1 dong
  async function handleSave(row) {
    try {
      setError("");
      await httpJson(`${API}/sinh-vien/${encodeURIComponent(row.mssv)}`, {
        method: "PUT",
        body: JSON.stringify({
          ho_ten: row.ho_ten ?? "",
          email: row.email ?? "",
          khoa_hoc: row.khoa_hoc ?? "",
        }),
      });
      await fetchList(page, keyword);
    } catch (e) {
      setError(String(e));
    }
  }

  // xoa 1 dong
  async function handleDelete(row) {
    if (!confirm(`Xoa sinh vien ${row.mssv}?`)) return;
    try {
      setError("");
      await httpJson(`${API}/sinh-vien/${encodeURIComponent(row.mssv)}`, {
        method: "DELETE",
      });
      await fetchList(1, keyword);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sinh vien</h1>

      {/* form them moi */}
      <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="vd: 22521379"
          value={mssv}
          onChange={(e) => setMssv(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="vd: Nguyen Van A"
          value={hoTen}
          onChange={(e) => setHoTen(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="vd: abc@xyz.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="vd: K2022"
            value={khoaHoc}
            onChange={(e) => setKhoaHoc(e.target.value)}
          />
          <button
            type="submit"
            className="bg-black text-white px-4 rounded hover:opacity-90"
          >
            Luu + Them
          </button>
        </div>
      </form>

      {/* tim kiem + refresh */}
      <div className="flex gap-2 mt-4 items-center">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Tim theo MSSV, ho ten, email..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          onClick={() => fetchList(1, keyword)}
          className="bg-black text-white px-4 rounded"
        >
          Tai lai
        </button>
        <div className="text-sm text-gray-500">Tong: {total}</div>
      </div>

      {error && <div className="mt-2 text-red-600">{error}</div>}
      {loading && <div className="mt-2">Dang tai...</div>}

      {/* bang du lieu */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border">MSSV</th>
              <th className="text-left p-2 border">Ho ten</th>
              <th className="text-left p-2 border">Email</th>
              <th className="text-left p-2 border">Khoa hoc</th>
              <th className="text-left p-2 border">Hanh dong</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  Chua co du lieu
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.mssv} className="border-t">
                <td className="p-2 border">{row.mssv}</td>
                <td className="p-2 border">
                  <input
                    className="border px-2 py-1 rounded w-full"
                    value={row.ho_ten || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((prev) =>
                        prev.map((it) =>
                          it.mssv === row.mssv ? { ...it, ho_ten: v } : it
                        )
                      );
                    }}
                  />
                </td>
                <td className="p-2 border">
                  <input
                    className="border px-2 py-1 rounded w-full"
                    value={row.email || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((prev) =>
                        prev.map((it) =>
                          it.mssv === row.mssv ? { ...it, email: v } : it
                        )
                      );
                    }}
                  />
                </td>
                <td className="p-2 border">
                  <input
                    className="border px-2 py-1 rounded w-full"
                    value={row.khoa_hoc || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((prev) =>
                        prev.map((it) =>
                          it.mssv === row.mssv ? { ...it, khoa_hoc: v } : it
                        )
                      );
                    }}
                  />
                </td>
                <td className="p-2 border">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(row)}
                      className="px-3 py-1 bg-black text-white rounded"
                    >
                      Luu
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                      Xoa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phan trang */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => fetchList(Math.max(1, page - 1), keyword)}
          disabled={page <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <div>
          Trang {page}/{totalPages}
        </div>
        <button
          onClick={() => fetchList(Math.min(totalPages, page + 1), keyword)}
          disabled={page >= totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
