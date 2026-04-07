import React, { useEffect, useState } from "react";
import { fetchJSON } from "../lib/api";

export default function LichSuDiemDanh(){
  const [items,setItems]=useState([]);
  const [total,setTotal]=useState(0);
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);

  async function load(){
    setLoading(true); setErr("");
    try{
      const data = await fetchJSON("/api/lich-su?page=1&limit=50");
      setItems(data.items||[]); setTotal(Number(data.total||0));
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  return (
    <>
      <h1>Lịch sử điểm danh</h1>
      {err && <div className="helper" style={{color:"#b91c1c"}}>{err}</div>}
      <div className="helper" style={{marginBottom:8}}>Tổng: {total}{loading?" · Đang tải…":""}</div>
      <table className="table">
        <thead>
          <tr>
            <th>MSSV</th><th>Họ tên</th><th>Thời gian</th><th>Trạng thái</th><th>Thiết bị</th>
          </tr>
        </thead>
        <tbody>
          {items.length===0 && !loading && <tr><td colSpan={5} className="helper">Chưa có dữ liệu</td></tr>}
          {items.map((r,i)=>(
            <tr key={r.id||i}>
              <td>{r.mssv}</td>
              <td>{r.ho_ten}</td>
              <td>{r.thoi_gian||r.created_at}</td>
              <td>{r.trang_thai||r.status}</td>
              <td>{r.thiet_bi||r.device||""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
