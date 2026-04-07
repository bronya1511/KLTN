import React, { useState } from "react";
import { BASE } from "../lib/api";

export default function SinhVienRow({ item, onChanged }) {
  const [edit, setEdit] = useState(false);
  const [mssv] = useState(item.mssv);
  const [ho_ten, setHoTen] = useState(item.ho_ten || "");
  const [email, setEmail] = useState(item.email || "");
  const [khoa_hoc, setKhoaHoc] = useState(item.khoa_hoc || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function doDelete() {
    if (!window.confirm(`Xóa sinh viên ${mssv}?`)) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`${BASE}/api/sinh-vien/${encodeURIComponent(mssv)}`, {
        method: "DELETE", headers: { "Accept": "application/json" }
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      onChanged?.(); // reload list
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally { setBusy(false); }
  }

  async function doSave() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`${BASE}/api/sinh-vien/${encodeURIComponent(mssv)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ ho_ten: ho_ten.trim(), email: email.trim(), khoa_hoc: khoa_hoc.trim() })
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setEdit(false);
      onChanged?.();
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally { setBusy(false); }
  }

  if (edit) {
    return (
      <tr>
        <td>{mssv}</td>
        <td><input className="input" value={ho_ten} onChange={e=>setHoTen(e.target.value)} /></td>
        <td><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></td>
        <td><input className="input" value={khoa_hoc} onChange={e=>setKhoaHoc(e.target.value)} /></td>
        <td style={{whiteSpace:"nowrap"}}>
          <button className="btn" onClick={doSave} disabled={busy}>{busy?"Đang lưu…":"Lưu"}</button>
          <button className="btn ghost" onClick={()=>{ setEdit(false); setMsg(""); }}>Hủy</button>
        </td>
        {msg && <td colSpan={5} className="helper" style={{color:"#b91c1c"}}>{msg}</td>}
      </tr>
    );
  }

  return (
    <tr>
      <td>{mssv}</td>
      <td>{item.ho_ten}</td>
      <td>{item.email}</td>
      <td>{item.khoa_hoc}</td>
      <td style={{whiteSpace:"nowrap"}}>
        <button className="btn" onClick={()=>setEdit(true)}>Sửa</button>
        <button className="btn danger" onClick={doDelete} disabled={busy}>Xóa</button>
      </td>
    </tr>
  );
}
