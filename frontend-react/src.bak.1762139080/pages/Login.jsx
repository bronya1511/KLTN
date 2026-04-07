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
      nav("/");
    } catch (e) {
      setErr(e?.response?.data?.message || "Loi dang nhap");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm">
        <h2 className="font-bold text-lg mb-4">Dang nhap</h2>
        <input className="border rounded px-3 py-2 w-full mb-3"
          value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input type="password" className="border rounded px-3 py-2 w-full mb-3"
          value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mat khau" />
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        <button className="bg-black text-white rounded px-4 py-2 w-full">Dang nhap</button>
      </form>
    </div>
  );
}
