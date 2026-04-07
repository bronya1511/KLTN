import React from "react";
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";

export default function SinhVienCreate() {
  const [mssv, setMssv] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [email, setEmail] = useState("");
  const [khoaHoc, setKhoaHoc] = useState("K2022");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState("");

  async function handleSave() {
    if (!mssv.trim()) {
      setMsg("Vui long nhap MSSV.");
      return;
    }
    setBusy(true);
    setMsg("");
    setProgress("Dang luu sinh vien...");

    try {
      // 1) L�u sinh vi�n
      const res1 = await fetch(`${API}/api/sinh-vien`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mssv: mssv.trim(),
          ho_ten: hoTen.trim(),
          email: email.trim(),
          khoa_hoc: khoaHoc.trim(),
        }),
      });

      if (!res1.ok) {
        const t = await res1.text();
        throw new Error(`Luu sinh vien that bai: ${t}`);
      }

      setProgress("Da luu sinh vien. Dang chup khuon mat (FaceDetect)...");
      // 2) Ch?p khu�n m?t + 3) Train (endpoint n�y l�m c? 2)
      const res2 = await fetch(`${API}/api/sinh-vien`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mssv: mssv.trim(),
          soAnh: 3,      // ch?p 3 ?nh
          camera: 0      // m?c �?nh camera 0
        }),
      });

      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok || data2?.ok === false) {
        const errMsg = data2?.message || JSON.stringify(data2);
        throw new Error(`Enroll/Train loi: ${errMsg}`);
      }

      setProgress("Hoan tat: Enroll + Train thanh cong.");
      setMsg("? Done");
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Them sinh vien moi</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">MSSV</label>
          <input className="w-full border rounded px-3 py-2"
                 value={mssv} onChange={e=>setMssv(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Ho ten</label>
          <input className="w-full border rounded px-3 py-2"
                 value={hoTen} onChange={e=>setHoTen(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2"
                 value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Khoa hoc</label>
          <input className="w-full border rounded px-3 py-2"
                 value={khoaHoc} onChange={e=>setKhoaHoc(e.target.value)} />
        </div>
      </div>

      {/* Ch? c?n 1 n�t duy nh?t */}
      <button
        disabled={busy}
        onClick={handleSave}
        className={`px-4 py-2 rounded text-white ${busy ? "bg-gray-500" : "bg-black hover:bg-gray-800"}`}>
        {busy ? "Dang xu ly..." : "Luu sinh vien + Enroll + Train"}
      </button>

      {/* Tr?ng th�i */}
      <div className="text-sm text-gray-600 whitespace-pre-wrap">
        {progress}
      </div>
      {msg && (
        <div className={`text-sm ${msg.startsWith("?") ? "text-green-600" : "text-red-600"}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
