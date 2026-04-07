import React, { useEffect, useState } from "react";

const API = (path) => `http://:8080`;

export default function LichSuDiemDanhPage() {
  const [rows, setRows]   = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [limit]           = useState(20);
  const [kw, setKw]       = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  const load = async (p = page, k = kw) => {
    try {
      setLoading(true);
      setErr("");
      const q = new URLSearchParams({ page: String(p), limit: String(limit), keyword: k }).toString();
      const r = await fetch(API(`/api/lich-su?${q}`));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(json.page ?? p);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, ""); /* first load */ }, []);

  return (
    <div>
      <h1>L?ch s? �i?m danh</h1>

      <div style={{display:"flex", gap:8, margin:"12px 0"}}>
        <input
          placeholder="T?m theo t? kh�a..."
          value={kw}
          onChange={e=>setKw(e.target.value)}
          style={{padding:"8px 10px", minWidth:260}}
        />
        <button onClick={()=>load(1, kw)}>T?i</button>
        <div style={{opacity:.7}}>T?ng: {total}</div>
      </div>

      {loading && <div>�ang t?i...</div>}
      {err && <div style={{color:"red"}}>L?i: {err}</div>}

      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["MSSV","H? t�n","Th?i gian","Tr?ng th�i","Thi?t b?"].map(h=>(
                <th key={h} style={{textAlign:"left", borderBottom:"1px solid #eee", padding:"8px 6px"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && !loading && (
              <tr><td colSpan={5} style={{padding:"12px 6px", opacity:.7}}>Ch�a c� d? li?u</td></tr>
            )}
            {rows.map((r, i)=>(
              <tr key={i}>
                <td style={{padding:"8px 6px"}}>{r.mssv ?? ""}</td>
                <td style={{padding:"8px 6px"}}>{r.ho_ten ?? ""}</td>
                <td style={{padding:"8px 6px"}}>{r.thoi_gian ?? ""}</td>
                <td style={{padding:"8px 6px"}}>{r.trang_thai ?? ""}</td>
                <td style={{padding:"8px 6px"}}>{r.ma_thiet_bi ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display:"flex", gap:8, marginTop:12}}>
        <button onClick={()=>{ const p=Math.max(1,page-1); load(p, kw); }} disabled={page<=1}>� Tr�?c</button>
        <div style={{opacity:.7}}>Trang {page}</div>
        <button onClick={()=>{ const p=page+1; load(p, kw); }} disabled={rows.length<limit}>Sau �</button>
      </div>
    </div>
  );
}
