import React from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import SinhVienList from "./pages/SinhVienList.jsx";
import LopHocPage   from "./pages/LopHocPage.jsx";
import DiemDanh     from "./pages/DiemDanh.jsx";
import GiangVien    from "./pages/GiangVien.jsx";
import Login        from "./pages/Login.jsx";
import logo from "./assets/logo.png";

const getUser = () => {
  if (typeof localStorage === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
};

function Layout({ children }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const user = getUser();
  const role = user?.role;

  const logout = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    window.location.href = "/login";
  };

  if (isLogin) {
    return children;
  }

  return (
    <div className="container" style={{ marginBottom: 16 }}>
      <nav className="topbar">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={logo} alt="logo" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>Điểm danh</span>
        </div>
        <div className="nav">
          {role === "admin" && (
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>Sinh viên</NavLink>
          )}
          <NavLink to="/lop-hoc" className={({ isActive }) => (isActive ? "active" : undefined)}>Lớp học</NavLink>
          {role === "admin" && (
            <NavLink to="/giang-vien" className={({ isActive }) => (isActive ? "active" : undefined)}>Giảng viên</NavLink>
          )}
          <NavLink to="/diem-danh" className={({ isActive }) => (isActive ? "active" : undefined)}>Điểm danh</NavLink>
          <button
            onClick={logout}
            style={{
              marginLeft: 8,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Đăng xuất
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  const user = getUser();
  const role = user?.role;
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={role === "admin" ? <SinhVienList/> : <Navigate to="/lop-hoc" replace />} />
          <Route path="/lop-hoc" element={<LopHocPage/>}/>
          {role === "admin" && (
            <Route path="/giang-vien" element={<GiangVien/>}/>
          )}
          <Route path="/diem-danh" element={<DiemDanh/>}/>
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
