import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

export default function DiemDanh() {
  const [logs, setLogs] = useState([]);
  const load = async () => {
    const { data } = await api.get(endpoints.diemDanh.logs({ page:1, limit:50 }));
    setLogs(data.data || []);
  };
  useEffect(() => { load(); }, []);

  const auto = async () => {
    await api.get(endpoints.diemDanh.auto());
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <button onClick={auto} className="bg-black text-white rounded px-4 py-2">
          Nhan dien va diem danh tu dong (demo)
        </button>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-2">Lich su diem danh gan day</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left">
            <th>ID</th><th>Sinh vien</th><th>Lop</th><th>Thoi gian vao</th><th>Thoi gian ra</th>
          </tr></thead>
          <tbody>
          {logs.map(l=>(
            <tr key={l.id} className="border-t">
              <td>{l.id}</td>
              <td>{l.sinh_vien_id}</td>
              <td>{l.lop_id}</td>
              <td>{l.thoi_gian_vao}</td>
              <td>{l.thoi_gian_ra || "-"}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
