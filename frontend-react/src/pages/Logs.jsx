import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

const fmtTime = (value) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  } catch {
    return value;
  }
};

export default function Logs() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await api.get(endpoints.diemDanh.logs({ page: 1, limit: 100 }));
    setItems(data.data || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-bold mb-3">Quản lý log điểm danh</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Mã lịch sử</th>
            <th>Sinh viên</th>
            <th>Lớp</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.ma_lich_su} className="border-t">
              <td className="py-1">{it.ma_lich_su}</td>
              <td className="py-1">
                <div className="font-medium">{it.mssv}</div>
                <div className="text-xs text-gray-500">{it.ho_ten}</div>
              </td>
              <td className="py-1">{it.ma_lop}</td>
              <td className="py-1">{fmtTime(it.thoi_gian_diem_danh)}</td>
              <td className="py-1">{it.trang_thai_diem_danh || "-"}</td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={5} className="text-center text-gray-500 py-4">
                Chưa có log điểm danh.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
