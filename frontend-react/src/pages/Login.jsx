import React, { useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post(endpoints.login(), { email, password });
      localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      // Reload hoàn toàn để thanh menu nhận role mới ngay (không cần Ctrl+F5)
      window.location.href = "/";
    } catch (e) {
      setErr(e?.response?.data?.message || "Loi dang nhap");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 24,
          borderRadius: 16,
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 20px 50px rgba(15,23,42,0.18)",
          border: "1px solid #e2e8f0",
          backdropFilter: "blur(4px)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Đăng nhập</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Truy cập hệ thống điểm danh</div>
          </div>
        </div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>Tài khoản</label>
            <input
              className="input"
              style={{ width: "100%", marginTop: 6 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email hoặc username"
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>Mật khẩu</label>
            <input
              type="password"
              className="input"
              style={{ width: "100%", marginTop: 6 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
            />
          </div>
          {err && <div style={{ color: "#b91c1c", fontSize: 13 }}>{err}</div>}
          <button className="btn" type="submit" style={{ width: "100%" }}>Đăng nhập</button>
        </form>
      </div>
    </div>
  );
}
