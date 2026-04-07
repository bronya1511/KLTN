import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

export default function Logs() {
  const [items, setItems] = useState([]);
  const load = async () => {
    const { data } = await api.get(endpoints.diemDanh.logs({ page:1, limit:100 }));
    setItems(data.data || []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-bold mb-3">Quan ly log checkin/checkout</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-left">
          <th>ID</th><th>SV</th><th>Lop</th><th>Vao</th><th>Ra</th>
        </tr></thead>
        <tbody>
          {items.map(it=>(
            <tr key={it.id} className="border-t">
              <td>{it.id}</td>
              <td>{it.sinh_vien_id}</td>
              <td>{it.lop_id}</td>
              <td>{it.thoi_gian_vao}</td>
              <td>{it.thoi_gian_ra || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
