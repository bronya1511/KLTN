import React, { useState } from "react";
import { BASE } from "../lib/api";

export default function SinhVienForm({ onDone }) {
  const [mssv, setMssv] = useState("");
  const [ho_ten, setHoTen] = useState("");
  const [email, setEmail] = useState("");
  const [khoa_hoc, setKhoaHoc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e){
    e.preventDefault();
    setMsg("");
    if(!mssv.trim()){ setMsg("Vui lòng nhập MSSV."); return; }
    setBusy(true);
    try{
      const res = await fetch(`${BASE}/api/sinh-vien`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Accept":"application/json" },
        body: JSON.stringify({ mssv: mssv.trim(), ho_ten: ho_ten.trim(), email: email.trim(), khoa_hoc: khoa_hoc.trim() })
      });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      setMsg("Đã lưu + Enroll + Train thành công.");
      // Xoá form và refresh danh sách
      setMssv(""); setHoTen(""); setEmail(""); setKhoaHoc("");
      onDone?.();
    }catch(err){
      setMsg(String(err?.message || err));
    }finally{
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{marginBottom:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12, maxWidth:720}}>
        <div>
          <label className="label">MSSV</label>
          <input className="input" placeholder="vd: 22521379" value={mssv} onChange={e=>setMssv(e.target.value)} />
        </div>
        <div>
          <label className="label">Họ tên</label>
          <input className="input" placeholder="vd: Nguyen Van A" value={ho_ten} onChange={e=>setHoTen(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" placeholder="vd: abc@xyz.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Khóa học</label>
          <input className="input" placeholder="vd: K2022" value={khoa_hoc} onChange={e=>setKhoaHoc(e.target.value)} />
        </div>
      </div>

      <div style={{marginTop:12, display:"flex", gap:8, alignItems:"center"}}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Đang lưu + Enroll + Train…" : "Lưu sinh viên + Enroll + Train"}
        </button>
        {msg && <span className="helper">{msg}</span>}
      </div>
    </form>
  );
}
