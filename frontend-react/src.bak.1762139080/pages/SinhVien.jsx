import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const box = { width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: 8, margin: "6px 0 14px" };
const btn = { padding: "10px 14px", borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" };

export default function SinhVien() {
  const [form, setForm] = useState({ mssv: "", ho_ten: "", email: "", khoa_hoc: "" });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [kw, setKw] = useState("");
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => ({ page: 1, limit: 50, keyword: kw.trim() }), [kw]);

  async function load() {
    try {
      const { data } = await api.get("/sinh-vien", { params: query });
      if (data?.ok) { setRows(data.rows || []); setTotal(data.total || 0); }
    } catch (e) { console.error(e); alert("Tải danh sách thất bại"); }
  }
  useEffect(() => { load(); }, [query.page, query.limit, query.keyword]);

  const onChange = (e) => setForm(s => ({ ...s, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.mssv) return alert("Vui lòng nhập MSSV");
    try {
      setLoading(true);
      const r1 = await api.post("/sinh-vien", {
        mssv: form.mssv.trim(), ho_ten: form.ho_ten || "", email: form.email || "", khoa_hoc: form.khoa_hoc || ""
      });
      if (!r1.data?.ok) throw new Error(r1.data?.message || "Tạo SV thất bại");
      const r2 = await api.post("/face/enroll", { mssv: form.mssv.trim(), soAnh: 3 });
      if (!r2.data?.ok) alert("Đã lưu SV. Enroll/Train cảnh báo, kiểm tra camera & python-face.");
      else alert("Đã lưu SV + Enroll + Train thành công!");
      setForm({ mssv: "", ho_ten: "", email: "", khoa_hoc: "" });
      await load();
    } catch (err) {
      console.error(err);
      alert("Thao tác thất bại: " + (err?.response?.data?.message || err.message));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 920, margin: "24px auto", padding: "0 12px" }}>
      <h2 style={{ marginBottom: 10 }}>Sinh viên</h2>

      <form onSubmit={onSubmit} style={{ marginTop: 8, background: "#fff" }}>
        <label>MSSV</label>
        <input name="mssv" placeholder="vd: 22521379" value={form.mssv} onChange={onChange} style={box} />
        <label>Họ tên</label>
        <input name="ho_ten" placeholder="vd: Nguyen Van A" value={form.ho_ten} onChange={onChange} style={box} />
        <label>Email</label>
        <input name="email" placeholder="vd: abc@xyz.com" value={form.email} onChange={onChange} style={box} />
        <label>Khóa học</label>
        <input name="khoa_hoc" placeholder="vd: K2022" value={form.khoa_hoc} onChange={onChange} style={box} />
        <button type="submit" disabled={loading} style={{ ...btn, opacity: loading ? .7 : 1 }}>
          {loading ? "Đang xử lý..." : "Lưu sinh viên + Enroll + Train"}
        </button>
      </form>

      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Tìm..." style={{ ...box, maxWidth: 240, margin: 0 }} />
          <button style={btn} onClick={load}>Tải lại</button>
          <span style={{ opacity: .7, marginLeft: 8 }}>Tổng: {total}</span>
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>MSSV</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Họ tên</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Email</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Khóa học</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} style={{ opacity: .7, padding: 10 }}>Chưa có dữ liệu</td></tr>
              ) : rows.map(r => (
                <tr key={r.mssv}>
                  <td style={{ borderBottom: "1px solid #f1f1f1", padding: 10 }}>{r.mssv}</td>
                  <td style={{ borderBottom: "1px solid #f1f1f1", padding: 10 }}>{r.ho_ten}</td>
                  <td style={{ borderBottom: "1px solid #f1f1f1", padding: 10 }}>{r.email}</td>
                  <td style={{ borderBottom: "1px solid #f1f1f1", padding: 10 }}>{r.khoa_hoc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
