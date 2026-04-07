import React, { useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

export default function DiemDanhAuto() {
  const [mssv, setMssv] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResult("");
    try {
      const { data } = await api.get(endpoints.diemDanh.auto(mssv.trim() || undefined));
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-bold">Diem danh tu dong</h2>
      <p className="text-sm text-gray-500">
        Nhap MSSV de test (khong can camera) hoac de trong de goi python-face service.
      </p>
      <div className="flex gap-2 items-center">
        <input
          className="input flex-1"
          placeholder="2152xxxx"
          value={mssv}
          onChange={(e) => setMssv(e.target.value)}
        />
        <button className="btn" onClick={run} disabled={busy}>
          {busy ? "Dang xu ly..." : "Chay diem danh"}
        </button>
      </div>
      <pre className="text-xs bg-gray-100 p-3 rounded whitespace-pre-wrap h-52 overflow-auto">
        {result || "Chua co du lieu."}
      </pre>
    </div>
  );
}
