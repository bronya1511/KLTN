import React from "react";

export default function SinhVienPage(){
  return (
    <div>
      <h2>Sinh vien</h2>
      <p>Trang nay da render OK (khong goi API de tranh loi). Sau khi on dinh, se noi lai BE.</p>
      <div style={{display:"grid",gap:8,maxWidth:680}}>
        <input placeholder="MSSV" />
        <input placeholder="Ho ten" />
        <input placeholder="Email" />
        <input placeholder="Khoa hoc (vd: K2022)" />
        <button style={{padding:"8px 12px"}}>Luu sinh vien + Enroll + Train</button>
      </div>
    </div>
  );
}
