import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  border: "1px solid #e5e7eb",
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)"
};
const input = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  background: "#f8fafc"
};
const button = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(79,70,229,0.25)"
};

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
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 12px", display: "flex", flexDirection: "column", gap: 16 }}>
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
        <div style={{ opacity: 0.9, marginTop: 6 }}>Thêm sinh viên, enroll khuôn mặt và tra cứu danh sách.</div>
      </div>

      <form onSubmit={onSubmit} style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600 }}>MSSV</label>
            <input name="mssv" placeholder="vd: 22521379" value={form.mssv} onChange={onChange} style={input} />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Họ tên</label>
            <input name="ho_ten" placeholder="vd: Nguyen Van A" value={form.ho_ten} onChange={onChange} style={input} />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Email</label>
            <input name="email" placeholder="vd: abc@xyz.com" value={form.email} onChange={onChange} style={input} />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Khóa học</label>
            <input name="khoa_hoc" placeholder="vd: K2022" value={form.khoa_hoc} onChange={onChange} style={input} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" disabled={loading} style={{ ...button, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Đang xử lý..." : "Lưu + Enroll + Train"}
          </button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Hệ thống sẽ enroll và train ngay sau khi lưu.</span>
        </div>
      </form>

      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="Tìm MSSV, họ tên, email..."
            style={{ ...input, maxWidth: 260, background: "#fff" }}
          />
          <button style={button} type="button" onClick={load}>Tải lại</button>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Tổng: {total}</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", background: "#f8fafc", padding: 12 }}>MSSV</th>
                <th style={{ textAlign: "left", background: "#f8fafc", padding: 12 }}>Họ tên</th>
                <th style={{ textAlign: "left", background: "#f8fafc", padding: 12 }}>Email</th>
                <th style={{ textAlign: "left", background: "#f8fafc", padding: 12 }}>Khóa học</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 12, color: "#94a3b8" }}>Chưa có dữ liệu</td></tr>
              ) : rows.map((r) => (
                <tr key={r.mssv} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.mssv}</td>
                  <td style={{ padding: 12 }}>{r.ho_ten}</td>
                  <td style={{ padding: 12 }}>{r.email}</td>
                  <td style={{ padding: 12 }}>{r.khoa_hoc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
