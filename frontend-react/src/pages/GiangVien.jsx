import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  border: "1px solid #e5e7eb",
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)"
};
const inputStyle = {
  width: "100%",
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

export default function GiangVien() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    ma_giang_vien: "",
    ho_ten: "",
    email: "",
    so_dien_thoai: "",
    mat_khau: "",
    tai_khoan: ""
  });

  async function load() {
    try {
      setLoading(true);
      setMsg("");
      const qs = search ? `?keyword=${encodeURIComponent(search)}` : "";
      const { data } = await api.get(endpoints.giangVien.list() + qs);
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(list.map((x) => ({ ...x, _id: x.ma_giang_vien })));
    } catch (e) {
      setItems([]);
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const updateRow = (id, patch) => {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, ...patch } : item)));
  };

  async function onCreate(e) {
    e.preventDefault();
    try {
      setMsg("");
      if (!form.ma_giang_vien || !form.ho_ten) {
        setMsg("Nhập mã giảng viên và họ tên");
        return;
      }
      await api.post(endpoints.giangVien.create(), {
        ...form,
      });
      setForm({ ma_giang_vien: "", ho_ten: "", email: "", so_dien_thoai: "", mat_khau: "", tai_khoan: "" });
      setMsg("Đã thêm giảng viên mới");
      await load();
    } catch (e) {
      setMsg(String(e?.message || e));
    }
  }

  async function onSave(row) {
    try {
      setMsg("");
      const payload = {
        ho_ten: row.ho_ten ?? "",
        email: row.email ?? "",
        so_dien_thoai: row.so_dien_thoai ?? "",
      };
      if (row.tai_khoan !== undefined) payload.tai_khoan = row.tai_khoan;
      if (row.new_pass) payload.mat_khau = row.new_pass;
      await api.put(endpoints.giangVien.byId(row.ma_giang_vien), payload);
      setMsg("Đã lưu giảng viên " + row.ma_giang_vien);
      await load();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function onDelete(row) {
    if (!confirm(`Xóa giảng viên ${row.ma_giang_vien}?`)) return;
    try {
      setMsg("");
      await api.delete(endpoints.giangVien.delete(row.ma_giang_vien));
      setMsg("Đã xóa " + row.ma_giang_vien);
      await load();
    } catch (e) {
      setMsg(String(e));
    }
  }

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: "18px 20px",
          borderRadius: 16,
          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          color: "#fff",
          boxShadow: "0 22px 40px rgba(14,165,233,0.25)"
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800 }}>Giảng viên</div>
        <div style={{ opacity: 0.9, marginTop: 6 }}>Quản lý hồ sơ, tài khoản và thông tin liên hệ.</div>
      </div>

      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
          <input
            style={inputStyle}
            placeholder="Mã giảng viên"
            value={form.ma_giang_vien}
            onChange={(e) => setForm((p) => ({ ...p, ma_giang_vien: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Họ tên"
            value={form.ho_ten}
            onChange={(e) => setForm((p) => ({ ...p, ho_ten: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="row" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginTop: 8 }}>
          <input
            style={inputStyle}
            placeholder="Tài khoản"
            value={form.tai_khoan}
            onChange={(e) => setForm((p) => ({ ...p, tai_khoan: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Số điện thoại"
            value={form.so_dien_thoai}
            onChange={(e) => setForm((p) => ({ ...p, so_dien_thoai: e.target.value }))}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Mật khẩu (tùy chọn)"
            value={form.mat_khau}
            onChange={(e) => setForm((p) => ({ ...p, mat_khau: e.target.value }))}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", gridColumn: "span 3" }}>
            <button className="btn" style={btnPrimary} onClick={onCreate}>Thêm</button>
            <input
              style={{ ...inputStyle, maxWidth: 260 }}
              placeholder="Tìm theo mã GV, họ tên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn" style={btnPrimary} onClick={load}>Tải lại</button>
          </div>
        </div>
        {msg && (
          <div className="badge" style={{ marginTop: 8, color: msg.startsWith("Đã") ? "#15803d" : "#b91c1c" }}>
            {msg}
          </div>
        )}
      </div>

      <div style={{ ...card }}>
        {loading ? <div className="badge">Đang tải...</div> : null}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr>
                <th>Mã GV</th>
                <th>Họ tên</th>
                <th>Tài khoản</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Mật khẩu (đặt mới)</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x._id}>
                  <td style={{ fontWeight: 600 }}>{x.ma_giang_vien}</td>
                  <td>
                    <input
                      style={inputStyle}
                      value={x.ho_ten || ""}
                      onChange={(e) => updateRow(x._id, { ho_ten: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={inputStyle}
                      value={x.tai_khoan || ""}
                      onChange={(e) => updateRow(x._id, { tai_khoan: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={inputStyle}
                      value={x.email || ""}
                      onChange={(e) => updateRow(x._id, { email: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={inputStyle}
                      value={x.so_dien_thoai || ""}
                      onChange={(e) => updateRow(x._id, { so_dien_thoai: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={inputStyle}
                      type="password"
                      placeholder="Đặt lại mật khẩu"
                      value={x.new_pass || ""}
                      onChange={(e) => updateRow(x._id, { new_pass: e.target.value })}
                    />
                  </td>
                  <td className="actions" style={{ display: "flex", gap: 6 }}>
                    <button className="btn" style={btnPrimary} onClick={() => onSave(x)}>Lưu</button>
                    <button className="btn" style={{ background: "#b91c1c" }} onClick={() => onDelete(x)}>Xóa</button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="badge">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
