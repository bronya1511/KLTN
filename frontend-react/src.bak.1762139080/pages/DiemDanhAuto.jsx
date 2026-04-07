import React, { useState } from "react";
import { endpoints } from "../services/endpoints";

export default function DiemDanhAuto() {
  const [mssv, setMssv] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setResult("");
    try {
      const url = endpoints.diemDanh.auto(mssv.trim() || undefined);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Loi");
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
      <div className="flex gap-2 items-center">
        <input className="input" placeholder="(Tuy chon) MSSV de test khong can camera"
               value={mssv} onChange={e=>setMssv(e.target.value)} />
        <button className="btn" onClick={run} disabled={busy}>{busy?"Dang xu ly...":"Chay diem danh"}</button>
      </div>
      <pre className="text-xs bg-gray-100 p-3 rounded whitespace-pre-wrap">{result}</pre>
    </div>
  );
}
