import { BASE } from "../lib/api";
import React, { useState } from "react";

export default function SinhVienMoi() {
  const [mssv, setMssv] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [email, setEmail] = useState("");
  const [khoaHoc, setKhoaHoc] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (!mssv || !hoTen || !email || !khoaHoc) {
      setMsg("Vui long nhap day du 4 truong.");
      return;
    }

    try {
      const res = await fetch(`/api/sinh-vien`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mssv,
          ho_ten: hoTen,
          email,
          khoa_hoc: khoaHoc,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setMsg(data?.message || `That bai: HTTP ${res.status}`);
        return;
      }

      setMsg("Tao sinh vien + Enroll + Train thanh cong.");
    } catch (err) {
      setMsg(`Loi ket noi: ${err.message}`);
    }
  }

  const inputStyle =
    { width:"100%", padding:"10px 12px", border:"1px solid #ddd",
      borderRadius:"8px", outline:"none" };

  const labelStyle = { display:"block", margin:"10px 0 6px", fontWeight:600 };

  return (
    <div style={{padding:"24px"}}>
      <h2 style={{fontSize:20, fontWeight:700, marginBottom:16}}>Them sinh vien moi</h2>

      {msg && <div style={{color:"#c00", marginBottom:12}}>{msg}</div>}

      <form onSubmit={submit} style={{maxWidth:560}}>
        <label style={labelStyle}>MSSV</label>
        <input value={mssv} onChange={e=>setMssv(e.target.value)} style={inputStyle} placeholder="vd: 22521379" />

        <label style={labelStyle}>Ho ten</label>
        <input value={hoTen} onChange={e=>setHoTen(e.target.value)} style={inputStyle} placeholder="vd: Thai Truong Thi" />

        <label style={labelStyle}>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} placeholder="vd: abc@xyz.com" />

        <label style={labelStyle}>Khoa hoc</label>
        <input value={khoaHoc} onChange={e=>setKhoaHoc(e.target.value)} style={inputStyle} placeholder="vd: K2022" />

        <button type="submit"
          style={{marginTop:16, background:"#000", color:"#fff",
                  padding:"10px 16px", borderRadius:"10px", cursor:"pointer"}}>
          Luu sinh vien + Enroll + Train
        </button>
      </form>
    </div>
  );
}
