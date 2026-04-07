import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

export default function SinhVienList() {
  const [items, setItems] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState({ mssv:"", ho_ten:"", email:"", khoa_hoc:"" });
  const [msg, setMsg] = useState("");

  const load = async () => {
    const url = endpoints.sinhVien.list() + `?page=1&limit=50&keyword=${encodeURIComponent(keyword)}`;
    const { data } = await api.get(url);
    setItems(data.data || []);
  };

  useEffect(()=>{ load(); },[]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!form.mssv || !form.ho_ten) { setMsg("Nhap mssv, ho ten"); return; }
    await api.post(endpoints.sinhVien.list(), form);
    setForm({ mssv:"", ho_ten:"", email:"", khoa_hoc:"" });
    load();
  };

  const remove = async (mssv) => {
    if (!confirm("Xoa sinh vien nay?")) return;
    await api.delete(endpoints.sinhVien.byId(mssv));
    load();
  };

  const update = async (mssv, patch) => {
    await api.put(endpoints.sinhVien.byId(mssv), patch);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Sinh vien</h2>

      <form onSubmit={submit} className="card space-y-3">
        {msg && <div className="text-red-600 text-sm">{msg}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">MSSV</label>
            <input className="input w-full" value={form.mssv} onChange={e=>setForm({...form,mssv:e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm">Ho ten</label>
            <input className="input w-full" value={form.ho_ten} onChange={e=>setForm({...form,ho_ten:e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm">Email</label>
            <input className="input w-full" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm">Khoa hoc</label>
            <input className="input w-full" value={form.khoa_hoc} onChange={e=>setForm({...form,khoa_hoc:e.target.value})}/>
          </div>
        </div>
        <button className="btn">Them moi</button>
      </form>

      <div className="card">
        <div className="flex gap-2 mb-3">
          <input className="input" placeholder="Tim..." value={keyword} onChange={(e)=>setKeyword(e.target.value)} />
          <button className="btn" onClick={load}>Tai lai</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>MSSV</th><th>Ho ten</th><th>Email</th><th>Khoa hoc</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(s=>(
              <tr key={s.mssv} className="border-t">
                <td>{s.mssv}</td>
                <td>{s.ho_ten}</td>
                <td>{s.email||"-"}</td>
                <td>
                  <input className="input" defaultValue={s.khoa_hoc||""}
                    onBlur={(e)=>update(s.mssv,{khoa_hoc:e.target.value})} />
                </td>
                <td>
                  <button className="text-red-600" onClick={()=>remove(s.mssv)}>Xoa</button>
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={5} className="text-gray-500 py-3">Chua co du lieu</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
