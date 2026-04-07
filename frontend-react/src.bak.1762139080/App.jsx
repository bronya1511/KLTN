import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import SinhVienPage from "./pages/SinhVienPage.jsx";
import LopHocPage from "./pages/LopHocPage.jsx";
import LichSuPage from "./pages/LichSuPage.jsx";
import TuDongPage from "./pages/TuDongPage.jsx";

const Nav = () => (
  <div style={{display:"flex",gap:16,padding:"12px 16px",borderBottom:"1px solid #eee",position:"sticky",top:0,background:"#fff",zIndex:10}}>
    <b>Diem danh</b>
    <Link to="/sinh-vien">Sinh vien</Link>
    <Link to="/lop-hoc">Lop hoc</Link>
    <Link to="/lich-su">Lich su diem danh</Link>
    <Link to="/tu-dong">Diem danh tu dong</Link>
  </div>
);

export default function App(){
  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', padding:16}}>
      <Nav/>
      <Routes>
        <Route path="/" element={<Navigate to="/sinh-vien" replace />} />
        <Route path="/sinh-vien" element={<SinhVienPage/>} />
        <Route path="/lop-hoc" element={<LopHocPage/>} />
        <Route path="/lich-su" element={<LichSuPage/>} />
        <Route path="/tu-dong" element={<TuDongPage/>} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </div>
  );
}
