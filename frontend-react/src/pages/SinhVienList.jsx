// SinhVienList.jsx - don gian, tu goi API
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const API_BASE = (import.meta?.env?.VITE_API_BASE || "/api").replace(/\/+$/, "");

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  border: "1px solid #e5e7eb",
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)"
};
const inputStyle = {
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  background: "#f8fafc"
};
const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(79,70,229,0.25)"
};

const getToken = () => (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);

async function httpJson(path, options = {}) {
  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/")?path:`/${path}`}`;
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type","application/json");
    body = JSON.stringify(body);
  }
  const res = await fetch(url, { ...options, headers, body, cache: "no-store" });
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}: ${text.slice(0,200)}`);
  if (!ct.includes("application/json")) throw new Error(`Khong phai JSON: ${text.slice(0,200)}`);
  return JSON.parse(text);
}

export default function SinhVienList() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [keyword, setKw]  = useState("");
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const [msg, setMsg]     = useState("");
  const [form, setForm]   = useState({
    mssv:"",
    ho_ten:"",
    email:"",
    khoa_hoc:"",
    lop:"",
    so_dien_thoai:"",
    ngay_sinh:"",
    khoa:"",
    nganh_hoc:"",
    tai_khoan:"",
    mat_khau:""
  });
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const limit = 20;
  const columnStyles = {
    mssv: { minWidth: "140px" },
    hoTen: { minWidth: "200px" },
    email: { minWidth: "220px" },
    lop: { minWidth: "140px" },
    soDienThoai: { minWidth: "160px" },
    ngaySinh: { minWidth: "160px" },
    khoaHoc: { minWidth: "140px" },
    khoa: { minWidth: "160px" },
    nganh: { minWidth: "200px" },
    taiKhoan: { minWidth: "160px" },
    matKhau: { minWidth: "160px" },
  };

  async function load(p=1, kw=""){
    try{
      setMsg("");
      const qs = `?page=${p}&limit=${limit}&keyword=${encodeURIComponent(kw)}`;
      const data = await httpJson(`/sinh-vien${qs}`);
      const rows = data.items || [];
      setItems(
        rows.map(r => ({
          ...r,
          lop: r.lop || "",
          so_dien_thoai: r.so_dien_thoai || "",
          ngay_sinh: r.ngay_sinh ? r.ngay_sinh.slice(0, 10) : "",
          khoa: r.khoa || "",
          nganh_hoc: r.nganh_hoc || "",
          khoa_hoc: r.khoa_hoc || "",
          tai_khoan: r.tai_khoan || "",
          mat_khau: r.mat_khau || "",
          _id: r.mssv,
          draft_mssv: r.mssv
        }))
      );
      setTotal(data.total||0); setPage(data.page||1);
    }catch(e){
      if (String(e).includes("401")) nav("/login");
      setItems([]); setTotal(0); setMsg(String(e));
    }
  }

  useEffect(()=>{ load(1, keyword); }, []);

  const updateRow = (id, patch) => {
    setItems(prev => prev.map(item => (item._id === id ? { ...item, ...patch } : item)));
  };

  async function onSubmit(e){
    e.preventDefault();
    try{
      setMsg("");
      if(!form.mssv || !form.ho_ten){ setMsg("Nhập MSSV, họ tên"); return; }

      // 1) tao sinh vien
      const payload = { ...form, ngay_sinh: form.ngay_sinh || null };
      await httpJson(`/sinh-vien`, { method:"POST", body: payload });

      // 2) tu dong chay FaceDetect + Train (mac dinh chup 10 anh, camera Pi)
      try {
        setMsg("Đang chụp ảnh và train mô hình, vui lòng đợi...");
        await httpJson(`/face/enroll`, {
          method: "POST",
          body: {
            mssv: form.mssv,
            soAnh: 10,
            camera: 0
          }
        });
        setMsg("Đã hoàn tất chụp/train cho " + form.mssv);
      } catch (err) {
        console.warn("Enroll failed", err);
        setMsg(String(err) || "Không thể chạy FaceDetect/Train");
      }

      setForm({
        mssv:"",
        ho_ten:"",
        email:"",
        khoa_hoc:"",
        lop:"",
        so_dien_thoai:"",
        ngay_sinh:"",
        khoa:"",
        nganh_hoc:"",
        tai_khoan:"",
        mat_khau:""
      });
      await load(1, keyword);
    }catch(e){ setMsg(String(e)); }
  }

  // Import CSV danh sách sinh viên
  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error("File trống");
      const headers = lines[0].split(/[,;]+/).map((h) => h.trim().toLowerCase());
      const idx = (name) => headers.indexOf(name);
      const pos = {
        mssv: idx("mssv"),
        ho_ten: idx("ho_ten"),
        email: idx("email"),
        khoa_hoc: idx("khoa_hoc"),
        lop: idx("lop"),
        so_dien_thoai: idx("so_dien_thoai"),
        ngay_sinh: idx("ngay_sinh"),
        khoa: idx("khoa"),
        nganh_hoc: idx("nganh_hoc"),
        tai_khoan: idx("tai_khoan"),
        mat_khau: idx("mat_khau")
      };
      if (pos.mssv === -1 || pos.ho_ten === -1) throw new Error("Thiếu cột bắt buộc: mssv, ho_ten");

      let ok = 0, fail = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(/[,;]+/).map((c) => c.trim());
        if (!cells[pos.mssv]) continue;
        const body = {
          mssv: cells[pos.mssv],
          ho_ten: cells[pos.ho_ten] || "",
          email: pos.email >= 0 ? cells[pos.email] : "",
          khoa_hoc: pos.khoa_hoc >= 0 ? cells[pos.khoa_hoc] : "",
          lop: pos.lop >= 0 ? cells[pos.lop] : "",
          so_dien_thoai: pos.so_dien_thoai >= 0 ? cells[pos.so_dien_thoai] : "",
          ngay_sinh: pos.ngay_sinh >= 0 ? cells[pos.ngay_sinh] || null : null,
          khoa: pos.khoa >= 0 ? cells[pos.khoa] : "",
          nganh_hoc: pos.nganh_hoc >= 0 ? cells[pos.nganh_hoc] : "",
          tai_khoan: pos.tai_khoan >= 0 ? cells[pos.tai_khoan] : "",
          mat_khau: pos.mat_khau >= 0 ? cells[pos.mat_khau] : ""
        };
        try {
          await httpJson(`/sinh-vien`, { method: "POST", body });
          ok++;
        } catch (err) {
          console.error("Import row fail", lines[i], err);
          fail++;
        }
      }
      await load(1, keyword);
      setImportMsg(`Import xong: ${ok} thành công, ${fail} lỗi.`);
    } catch (err) {
      setImportMsg(`Lỗi import: ${err.message || err}`);
    } finally {
      setImporting(false);
    }
  };

  async function onSave(row){
    try{
      setMsg("");
    const body = {
        ho_ten: row.ho_ten ?? "",
        email: row.email ?? "",
        khoa_hoc: row.khoa_hoc ?? "",
        lop: row.lop ?? "",
        so_dien_thoai: row.so_dien_thoai ?? "",
        ngay_sinh: row.ngay_sinh || null,
        khoa: row.khoa ?? "",
        nganh_hoc: row.nganh_hoc ?? "",
        tai_khoan: row.tai_khoan ?? "",
        mat_khau: row.mat_khau ?? ""
      };
      if (row.draft_mssv && row.draft_mssv !== row._id) {
        body.new_mssv = row.draft_mssv;
      }
      await httpJson(`/sinh-vien/${encodeURIComponent(row._id)}`, {
        method:"PUT",
        body
      });
      await load(page, keyword);
    }catch(e){ setMsg(String(e)); }
  }

  async function onDelete(row){
    if(!confirm(`Xóa sinh viên ${row.mssv}?`)) return;
    try{
      setMsg("");
      await httpJson(`/sinh-vien/${encodeURIComponent(row._id)}`, { method:"DELETE" });
      await load(1, keyword);
    }catch(e){ setMsg(String(e)); }
  }

  return (
    <div className="container" style={{ maxWidth: "1650px", width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: "18px 20px",
          borderRadius: 16,
          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          color: "#fff",
          boxShadow: "0 22px 40px rgba(14,165,233,0.25)"
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800 }}>Sinh viên</div>
        <div style={{ opacity: 0.9, marginTop: 6 }}>
          Thêm hồ sơ, enroll khuôn mặt và cập nhật danh sách nhanh chóng.
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ ...card, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {msg && <div className="badge" style={{ color: "#b91c1c" }}>{msg}</div>}
        <div className="row">
          <input className="input" style={inputStyle} placeholder="VD: 22521379" value={form.mssv} onChange={e=>setForm({...form, mssv:e.target.value})}/>
          <input className="input" style={inputStyle} placeholder="VD: Nguyễn Văn A" value={form.ho_ten} onChange={e=>setForm({...form, ho_ten:e.target.value})}/>
          <input className="input" style={inputStyle} placeholder="VD: abc@xyz.com" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        </div>
        <div className="row" style={{marginTop:8}}>
          <input className="input" style={inputStyle} placeholder="Lớp" value={form.lop} onChange={e=>setForm({...form, lop:e.target.value})}/>
          <input className="input" style={inputStyle} placeholder="Số điện thoại" value={form.so_dien_thoai} onChange={e=>setForm({...form, so_dien_thoai:e.target.value})}/>
          <input className="input" style={inputStyle} type="date" placeholder="Ngày sinh" value={form.ngay_sinh} onChange={e=>setForm({...form, ngay_sinh:e.target.value})}/>
        </div>
        <div className="row" style={{marginTop:8}}>
          <input className="input" style={inputStyle} placeholder="Khóa học" value={form.khoa_hoc} onChange={e=>setForm({...form, khoa_hoc:e.target.value})}/>
          <input className="input" style={inputStyle} placeholder="Khoa" value={form.khoa} onChange={e=>setForm({...form, khoa:e.target.value})}/>
          <input className="input" style={inputStyle} placeholder="Ngành học" value={form.nganh_hoc} onChange={e=>setForm({...form, nganh_hoc:e.target.value})}/>
          <input className="input" style={inputStyle} placeholder="Tài khoản" value={form.tai_khoan} onChange={e=>setForm({...form, tai_khoan:e.target.value})}/>
          <input className="input" style={inputStyle} type="password" placeholder="Mật khẩu" value={form.mat_khau} onChange={e=>setForm({...form, mat_khau:e.target.value})}/>
        </div>
        <div style={{marginTop:8, display: "flex", alignItems: "center", gap: 10}}>
          <button className="btn" style={btnPrimary} type="submit">Lưu + Thêm</button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Hệ thống sẽ enroll & train sau khi lưu.</span>
        </div>
      </form>

      <div
        className="card"
        style={{
          ...card,
          overflowX: "auto",
          position: "relative",
        }}
      >
        <div style={{display:"flex", gap:8, marginBottom:8, alignItems: "center", flexWrap: "wrap"}}>
          <input className="input" style={{ ...inputStyle, maxWidth: 320 }} placeholder="Tìm theo MSSV, họ tên, email, khóa học"
                 value={keyword} onChange={(e)=>setKw(e.target.value)} />
          <button className="btn" style={btnPrimary} onClick={()=>load(1, keyword)}>Tải lại</button>
          <label className="btn" style={{ ...btnPrimary, cursor: "pointer" }}>
            {importing ? "Đang import..." : "Import CSV SV"}
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
              disabled={importing}
            />
          </label>
          {importMsg && <span className="badge">{importMsg}</span>}
          <div className="badge">Tổng: {total}</div>
        </div>
        <table className="table" style={{ minWidth: 1600, borderRadius: 12, overflow: "hidden" }}>
          <thead>
            <tr>
              <th style={columnStyles.mssv}>MSSV</th>
              <th style={columnStyles.hoTen}>Họ tên</th>
              <th style={columnStyles.email}>Email</th>
              <th style={columnStyles.lop}>Lớp</th>
              <th style={columnStyles.soDienThoai}>Số điện thoại</th>
              <th style={columnStyles.ngaySinh}>Ngày sinh</th>
              <th style={columnStyles.khoaHoc}>Khóa học</th>
              <th style={columnStyles.khoa}>Khoa</th>
              <th style={columnStyles.nganh}>Ngành học</th>
              <th style={columnStyles.taiKhoan}>Tài khoản</th>
              <th style={columnStyles.matKhau}>Mật khẩu</th>
              <th style={{ minWidth: "160px" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s=>(
              <tr key={s._id}>
                <td style={columnStyles.mssv}>
                  <input
                    className="input"
                    style={inputStyle}
                    value={s.draft_mssv || ""}
                    onChange={(e)=>updateRow(s._id, { draft_mssv: e.target.value })}
                  />
                </td>
                <td style={columnStyles.hoTen}>
                  <input className="input" style={inputStyle} value={s.ho_ten||""} onChange={(e)=>updateRow(s._id, { ho_ten: e.target.value })}/>
                </td>
                <td style={columnStyles.email}><input className="input" style={inputStyle} value={s.email||""} onChange={(e)=>updateRow(s._id, { email: e.target.value })}/></td>
                <td style={columnStyles.lop}><input className="input" style={inputStyle} value={s.lop||""} onChange={(e)=>updateRow(s._id, { lop: e.target.value })}/></td>
                <td style={columnStyles.soDienThoai}><input className="input" style={inputStyle} value={s.so_dien_thoai||""} onChange={(e)=>updateRow(s._id, { so_dien_thoai: e.target.value })}/></td>
                <td style={columnStyles.ngaySinh}><input className="input" style={inputStyle} type="date" value={s.ngay_sinh||""} onChange={(e)=>updateRow(s._id, { ngay_sinh: e.target.value })}/></td>
                <td style={columnStyles.khoaHoc}><input className="input" style={inputStyle} value={s.khoa_hoc||""} onChange={(e)=>updateRow(s._id, { khoa_hoc: e.target.value })}/></td>
                <td style={columnStyles.khoa}><input className="input" style={inputStyle} value={s.khoa||""} onChange={(e)=>updateRow(s._id, { khoa: e.target.value })}/></td>
                <td style={columnStyles.nganh}><input className="input" style={inputStyle} value={s.nganh_hoc||""} onChange={(e)=>updateRow(s._id, { nganh_hoc: e.target.value })}/></td>
                <td style={columnStyles.taiKhoan}><input className="input" style={inputStyle} value={s.tai_khoan||""} onChange={(e)=>updateRow(s._id, { tai_khoan: e.target.value })}/></td>
                <td style={columnStyles.matKhau}><input className="input" style={inputStyle} type="password" value={s.mat_khau||""} onChange={(e)=>updateRow(s._id, { mat_khau: e.target.value })}/></td>
                <td className="actions" style={{ minWidth: "160px" }}>
                  <button className="btn" style={btnPrimary} onClick={()=>onSave(s)}>Lưu</button>
                  <button className="btn" onClick={()=>onDelete(s)} style={{background:"#b91c1c"}}>Xóa</button>
                </td>
              </tr>
            ))}
            {items.length===0 && (
              <tr>
                <td colSpan={10} className="badge">
                  Chưa có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
