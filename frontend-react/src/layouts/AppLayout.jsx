import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const isActive = (p) => (pathname.startsWith(p) ? { fontWeight: 600, textDecoration: "underline" } : {});

  return (
    <div>
      <nav style={{display:"flex",gap:18, padding:"14px 18px", borderBottom:"1px solid #eee"}}>
        <Link to="/sinh-vien" style={isActive("/sinh-vien")}>Sinh vi�n</Link>
        {/* N?u c?n th�m menu kh�c, th�m Link ? ��y */}
      </nav>
      <main>{children}</main>
    </div>
  );
}
