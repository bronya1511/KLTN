import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

export default function KhoaHoc() {
  const [sv, setSv] = useState([]);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setErr("");
      const { data } = await api.get(endpoints.sinhVien.list());
      setSv(data.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Loi tai du lieu");
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.khoa_hoc) return;
    try {
      setErr("");
      await api.put(endpoints.sinhVien.byId(edit.mssv) + "/khoa-hoc", { khoa_hoc: edit.khoa_hoc });
      setEdit(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Loi cap nhat khoa hoc");
    }
  };

  return (
    <div className="card">
      <h3 className="font-bold mb-3">Quan ly khoa (nam hoc) cua sinh vien</h3>
      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Ho ten</th>
            <th>MSSV</th>
            <th>Khoa hoc</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sv.map((s) => (
            <tr key={s.mssv} className="border-t">
              <td>{s.ho_ten}</td>
              <td>{s.mssv}</td>
              <td>
                {edit?.mssv === s.mssv ? (
                  <input
                    className="input"
                    value={edit.khoa_hoc || ""}
                    onChange={(e) => setEdit({ ...edit, khoa_hoc: e.target.value })}
                    placeholder="vd: K2021"
                  />
                ) : (
                  s.khoa_hoc || "-"
                )}
              </td>
              <td>
                {edit?.mssv === s.mssv ? (
                  <button onClick={save} className="btn">Luu</button>
                ) : (
                  <button onClick={() => setEdit({ mssv: s.mssv, khoa_hoc: s.khoa_hoc })} className="text-blue-700">
                    Sua
                  </button>
                )}
              </td>
            </tr>
          ))}
          {sv.length === 0 && (
            <tr><td colSpan={4} className="text-gray-500 py-4">Chua co du lieu</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
