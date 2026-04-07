import React from "react";
import { NavLink } from "react-router-dom";

const link = ({ isActive }) =>
  ({
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: isActive ? "#fff" : "#111",
    background: isActive ? "#111" : "transparent",
  });

export default function Nav(){
  return (
    <nav style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
      <NavLink to="/sinh-vien" style={link}>Sinh viên</NavLink>
      <NavLink to="/lop-hoc" style={link}>Lớp học</NavLink>
      <NavLink to="/lich-su" style={link}>Lịch sử điểm danh</NavLink>
      <NavLink to="/tu-dong" style={link}>Điểm danh tự động</NavLink>
    </nav>
  );
}
