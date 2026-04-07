// LopHocPage.jsx - quản lý lớp học: admin/giảng viên có thể tạo/sửa/xóa, sinh viên chỉ xem.
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

// SLOTS tham chiếu thời gian tiết học
const SLOTS = [
  { id: 1, label: "Tiết 1 (07:30 - 08:15)", start: "07:30", end: "08:15" },
  { id: 2, label: "Tiết 2 (08:15 - 09:00)", start: "08:15", end: "09:00" },
  { id: 3, label: "Tiết 3 (09:00 - 09:45)", start: "09:00", end: "09:45" },
  { id: 4, label: "Tiết 4 (10:00 - 10:45)", start: "10:00", end: "10:45" },
  { id: 5, label: "Tiết 5 (10:45 - 11:30)", start: "10:45", end: "11:30" },
  { id: 6, label: "Tiết 6 (13:00 - 13:45)", start: "13:00", end: "13:45" },
  { id: 7, label: "Tiết 7 (13:45 - 14:30)", start: "13:45", end: "14:30" },
  { id: 8, label: "Tiết 8 (14:30 - 15:15)", start: "14:30", end: "15:15" },
  { id: 9, label: "Tiết 9 (15:30 - 16:15)", start: "15:30", end: "16:15" },
  { id: 10, label: "Tiết 10 (16:15 - 17:00)", start: "16:15", end: "17:00" },
  { id: 11, label: "Buổi tối (17:45 - 20:45)", start: "17:45", end: "20:45" },
];
const slotMap = Object.fromEntries(SLOTS.map((s) => [String(s.id), s]));
const getHM = (val) => {
  if (!val) return "";
  const str = String(val);
  if (str.includes("T")) return str.slice(11, 16);
  if (str.length >= 5) return str.slice(0, 5);
  return str;
};
const formatRange = (s, e) => {
  const a = getHM(s), b = getHM(e);
  return a && b ? `${a} - ${b}` : "Chưa đặt";
};

const DAYS = [
  { id: 2, label: "Thứ 2" },
  { id: 3, label: "Thứ 3" },
  { id: 4, label: "Thứ 4" },
  { id: 5, label: "Thứ 5" },
  { id: 6, label: "Thứ 6" },
  { id: 7, label: "Thứ 7" },
];
const dayMap = Object.fromEntries(DAYS.map((d) => [String(d.id), d.label]));

export default function LopHocPage() {
  const [user] = useState(() => {
    if (typeof localStorage === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const isAdmin = user?.role === "admin";
  const isGV = user?.role === "giang_vien";
  const isSV = user?.role === "sinh_vien";

  const [items, setItems] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [keyword, setKw] = useState("");
  const [filterGV, setFilterGV] = useState("");
  const [filterMSSV, setFilterMSSV] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentsOfClass, setStudentsOfClass] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState("");
  const [enroll, setEnroll] = useState({ ma_lop: "", mssv: "" });
  const [enrollMsg, setEnrollMsg] = useState("");
  const [enrollList, setEnrollList] = useState([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [ma, setMa] = useState("");
  const [tenMon, setTenMon] = useState("");
  const [phong, setPhong] = useState("");
  const [maGV, setMaGV] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [ngayHoc, setNgayHoc] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // load danh sách lớp
  async function load(p = 1, kw = "", opts = {}) {
    try {
      setMsg("");
      const params = new URLSearchParams();
      params.set("page", p); params.set("limit", limit);
      if (kw) params.set("keyword", kw);
      if (opts.ma_giang_vien) params.set("ma_giang_vien", opts.ma_giang_vien);
      if (opts.mssv) params.set("mssv", opts.mssv);
      const { data } = await api.get(`${endpoints.lopHoc.list()}?${params.toString()}`);
      const payload = data || {};
      const list = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
      const mapped = list.map((item) => {
        const startHM = getHM(item.thoi_gian_bat_dau);
        const endHM = getHM(item.thoi_gian_ket_thuc);
        const slotStartId = SLOTS.find((s) => s.start === startHM)?.id;
        const slotEndId = SLOTS.find((s) => s.end === endHM)?.id;
        return {
          ...item,
          _id: item.ma_lop,
          draft_ma_gv: item.ma_giang_vien || "",
          slotStart: slotStartId ? String(slotStartId) : "",
          slotEnd: slotEndId ? String(slotEndId) : "",
          draft_day: item.ngay_hoc ? String(item.ngay_hoc) : "",
        };
      });
      const totalItems = payload.total || payload.data?.total || list.length;
      setItems(mapped);
      setTotal(totalItems);
      setPage(payload.page || p);
    } catch (e) {
      setItems([]); setTotal(0); setMsg(String(e));
    }
  }

  useEffect(() => {
    const opts = {};
    if (isGV) { opts.ma_giang_vien = user?.ma_giang_vien; setFilterGV(user?.ma_giang_vien || ""); }
    if (isSV) { opts.mssv = user?.mssv; setFilterMSSV(user?.mssv || ""); }
    load(1, keyword, opts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadTeacher() {
      try {
        const { data } = await api.get(endpoints.giangVien.list());
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setTeachers(list);
      } catch {
        setTeachers([]);
      }
    }
    loadTeacher();
  }, []);

  const updateClass = (id, patch) => {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, ...patch } : item)));
  };

  // CRUD lớp (chỉ admin/gv)
  async function onCreate(e) {
    e.preventDefault();
    try {
      setMsg("");
      if (!ma || !tenMon) { setMsg("Nhập mã lớp và tên môn học"); return; }
      if (slotStart && slotEnd && Number(slotEnd) < Number(slotStart)) {
        setMsg("Tiết kết thúc phải lớn hơn hoặc bằng tiết bắt đầu");
        return;
      }
      await api.post(endpoints.lopHoc.list(), {
        ma_lop: ma,
        ten_mon_hoc: tenMon,
        phong_hoc: phong,
        ngay_hoc: ngayHoc ? Number(ngayHoc) : null,
        thoi_gian_bat_dau: slotStart ? `2024-01-01 ${slotMap[String(slotStart)]?.start}:00` : null,
        thoi_gian_ket_thuc: slotEnd ? `2024-01-01 ${slotMap[String(slotEnd)]?.end}:00` : null,
        ma_giang_vien: maGV || null,
      });
      setMa(""); setTenMon(""); setPhong(""); setMaGV(""); setSlotStart(""); setSlotEnd(""); setNgayHoc("");
      const opts = isGV ? { ma_giang_vien: user?.ma_giang_vien } : isSV ? { mssv: user?.mssv } : {};
      await load(1, keyword, opts);
    } catch (e) { setMsg(String(e)); }
  }

  async function onSave(row) {
    try {
      setMsg("");
      const start = row.slotStart ? slotMap[row.slotStart]?.start : row.thoi_gian_bat_dau || null;
      const end = row.slotEnd ? slotMap[row.slotEnd]?.end : row.thoi_gian_ket_thuc || null;
      if (start && end && start > end) { setMsg("Tiết bắt đầu phải trước tiết kết thúc"); return; }
      const body = {
        ten_mon_hoc: row.ten_mon_hoc ?? "",
        phong_hoc: row.phong_hoc ?? "",
        thoi_gian_bat_dau: start ? `2024-01-01 ${start}:00` : null,
        thoi_gian_ket_thuc: end ? `2024-01-01 ${end}:00` : null,
        ma_giang_vien: row.draft_ma_gv ?? row.ma_giang_vien ?? null,
        ngay_hoc: row.draft_day ? Number(row.draft_day) : row.ngay_hoc ?? null,
      };
      await api.put(endpoints.lopHoc.byId(row._id), body);
      const opts = isGV ? { ma_giang_vien: user?.ma_giang_vien } : isSV ? { mssv: user?.mssv } : {};
      await load(page, keyword, opts);
    } catch (e) { setMsg(String(e)); }
  }

  async function onDelete(row) {
    if (!confirm(`Xóa lớp ${row.ma_lop}?`)) return;
    try {
      setMsg("");
      await api.delete(`${endpoints.lopHoc.byId(row._id)}?force=true`);
      const opts = isGV ? { ma_giang_vien: user?.ma_giang_vien } : isSV ? { mssv: user?.mssv } : {};
      await load(1, keyword, opts);
    } catch (e) { setMsg(String(e)); }
  }

  // Đăng ký lớp
  async function addStudentToClass(e) {
    e.preventDefault();
    try {
      setEnrollMsg("");
      if (!enroll.ma_lop || !enroll.mssv) { setEnrollMsg("Nhập mã lớp và MSSV"); return; }
      await api.post(endpoints.dangKyLop.add(), { ma_lop: enroll.ma_lop, mssv: enroll.mssv });
      setEnrollMsg("Đã thêm sinh viên vào lớp.");
      await fetchEnrollList(enroll.ma_lop);
      setEnroll((prev) => ({ ...prev, mssv: "" }));
    } catch (err) { setEnrollMsg(err?.message || String(err)); }
  }
  async function fetchEnrollList(ma_lop) {
    if (!ma_lop) return;
    try {
      setEnrollLoading(true);
      const { data } = await api.get(endpoints.dangKyLop.listByLop(ma_lop));
      setEnrollList(data.data || []);
    } catch { setEnrollList([]); }
    finally { setEnrollLoading(false); }
  }

  async function fetchStudents(ma_lop) {
    if (!ma_lop || isSV) return;
    try {
      const { data } = await api.get(endpoints.lopHoc.students(ma_lop));
      setStudentsOfClass(data.data || data || []);
    } catch { setStudentsOfClass([]); }
  }
  async function fetchAttendance(ma_lop) {
    if (!ma_lop || isSV) return;
    try {
      const { data } = await api.get(endpoints.lopHoc.attendance(ma_lop));
      setAttendances(data.data || data || []);
    } catch { setAttendances([]); }
  }
  const onSelectClass = (cls) => {
    setSelectedClass(cls);
    fetchStudents(cls._id);
    fetchAttendance(cls._id);
    fetchEnrollList(cls._id);
  };
  const exportAttendance = async (ma_lop) => {
    if (!ma_lop) return;
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
      const url = endpoints.lopHoc.attendance(ma_lop, "export=csv");
      const res = await fetch(url, {
        headers: {
          Accept: "text/csv",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `attendance_${ma_lop}.csv`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      alert("Export CSV thất bại: " + (err?.message || err));
    }
  };

  // Import CSV danh sách lớp: cột ma_lop,ten_mon_hoc,phong_hoc,ngay_hoc,tiet_bat_dau,tiet_ket_thuc,ma_giang_vien
  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error("File trống");
      const headers = lines[0].split(/[,;]+/).map((h) => h.trim().toLowerCase());
      const getIdx = (name) => headers.indexOf(name);
      const idx = {
        ma_lop: getIdx("ma_lop"),
        ten_mon_hoc: getIdx("ten_mon_hoc"),
        phong_hoc: getIdx("phong_hoc"),
        ngay_hoc: getIdx("ngay_hoc"),
        tiet_bat_dau: getIdx("tiet_bat_dau"),
        tiet_ket_thuc: getIdx("tiet_ket_thuc"),
        ma_giang_vien: getIdx("ma_giang_vien"),
      };
      if (idx.ma_lop === -1 || idx.ten_mon_hoc === -1) {
        throw new Error("Thiếu cột bắt buộc: ma_lop, ten_mon_hoc");
      }

      let ok = 0, fail = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(/[,;]+/).map((c) => c.trim());
        if (!cells[idx.ma_lop]) continue;
        const slotStartVal = idx.tiet_bat_dau >= 0 ? cells[idx.tiet_bat_dau] : "";
        const slotEndVal = idx.tiet_ket_thuc >= 0 ? cells[idx.tiet_ket_thuc] : "";
        const slotStartId = slotStartVal ? String(slotStartVal) : "";
        const slotEndId = slotEndVal ? String(slotEndVal) : "";
        const body = {
          ma_lop: cells[idx.ma_lop],
          ten_mon_hoc: cells[idx.ten_mon_hoc] || "",
          phong_hoc: idx.phong_hoc >= 0 ? cells[idx.phong_hoc] : "",
          ngay_hoc: idx.ngay_hoc >= 0 && cells[idx.ngay_hoc] ? Number(cells[idx.ngay_hoc]) : null,
          ma_giang_vien: idx.ma_giang_vien >= 0 ? (cells[idx.ma_giang_vien] || null) : null,
          thoi_gian_bat_dau: slotStartId ? `2024-01-01 ${slotMap[slotStartId]?.start || slotStartId}:00` : null,
          thoi_gian_ket_thuc: slotEndId ? `2024-01-01 ${slotMap[slotEndId]?.end || slotEndId}:00` : null,
        };
        try {
          await api.post(endpoints.lopHoc.list(), body);
          ok++;
        } catch (e) {
          console.error("Import row fail", lines[i], e);
          fail++;
        }
      }
      const opts = isGV ? { ma_giang_vien: user?.ma_giang_vien } : isSV ? { mssv: user?.mssv } : {};
      await load(1, keyword, opts);
      setImportMsg(`Import xong: ${ok} thành công, ${fail} lỗi.`);
    } catch (err) {
      setImportMsg(`Lỗi import: ${err.message || err}`);
    } finally {
      setImporting(false);
    }
  };

  // UI helpers
  const card = {
    background: "#fff",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 40px rgba(15,23,42,0.08)"
  };
  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    background: "#f8fafc"
  };
  const btnPrimary = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(79,70,229,0.25)"
  };
  const statusPill = (text) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: 999, fontSize: 12,
      background: text === "Hop le" ? "#ecfdf3" : "#fef2f2",
      color: text === "Hop le" ? "#15803d" : "#b91c1c",
      border: `1px solid ${text === "Hop le" ? "#bbf7d0" : "#fecdd3"}`
    }}>
      <span>{text === "Hop le" ? "🟢" : "⚠️"}</span>
      <span>{text || "Chưa rõ"}</span>
    </span>
  );

  const canEditRows = isAdmin; // chỉ admin được sửa, GV/SV chỉ xem

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: "18px 20px",
          borderRadius: 16,
          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          color: "#fff",
          boxShadow: "0 22px 40px rgba(14,165,233,0.25)"
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800 }}>Lớp học</div>
        <div style={{ opacity: 0.9, marginTop: 6 }}>Tạo lớp, gán giảng viên, thời gian học và quản lý đăng ký.</div>
      </div>

      {isAdmin && (
        <form onSubmit={onCreate} style={{ ...card, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {msg && <div className="badge" style={{ color: "#b91c1c" }}>{msg}</div>}
          <div className="row">
            <input className="input" style={inputStyle} placeholder="VD: CE304" value={ma} onChange={(e) => setMa(e.target.value)} />
            <input className="input" style={inputStyle} placeholder="Tên môn" value={tenMon} onChange={(e) => setTenMon(e.target.value)} />
            <input className="input" style={inputStyle} placeholder="Phòng học" value={phong} onChange={(e) => setPhong(e.target.value)} />
            <select className="input" style={inputStyle} value={maGV} onChange={(e) => setMaGV(e.target.value)}>
              <option value="">Chọn giảng viên</option>
              {teachers.map((gv) => (
                <option key={gv.ma_giang_vien} value={gv.ma_giang_vien}>
                  {gv.ho_ten || gv.ma_giang_vien}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 8 }}>
            <select className="input" style={inputStyle} value={ngayHoc} onChange={(e) => setNgayHoc(e.target.value)}>
              <option value="">Chọn ngày học (thứ)</option>
              {DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <select className="input" style={inputStyle} value={slotStart} onChange={(e) => setSlotStart(e.target.value)}>
              <option value="">Chọn tiết bắt đầu</option>
              {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select className="input" style={inputStyle} value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)}>
              <option value="">Chọn tiết kết thúc</option>
              {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn" style={btnPrimary} type="submit">Thêm</button>
          </div>
        </form>
      )}

      {isAdmin && (
        <div style={{ ...card, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Thêm sinh viên vào lớp</h3>
          {enrollMsg && <div className="badge" style={{ color: enrollMsg.includes("Đã") ? "#15803d" : "#b91c1c" }}>{enrollMsg}</div>}
          <form onSubmit={addStudentToClass} className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input className="input" style={inputStyle} placeholder="Mã lớp (vd: CE304)" value={enroll.ma_lop} onChange={(e) => setEnroll((prev) => ({ ...prev, ma_lop: e.target.value }))} />
            <input className="input" style={inputStyle} placeholder="MSSV (vd: 22521379)" value={enroll.mssv} onChange={(e) => setEnroll((prev) => ({ ...prev, mssv: e.target.value }))} />
            <button className="btn" style={btnPrimary} type="submit">Thêm</button>
            <button className="btn" style={btnPrimary} type="button" onClick={() => fetchEnrollList(enroll.ma_lop)} disabled={!enroll.ma_lop}>
              Xem danh sách lớp
            </button>
          </form>
          <div className="badge" style={{ marginBottom: 8 }}>Sau khi nhập, bấm “Xem danh sách lớp” để xem sinh viên đã đăng ký.</div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Mã đăng ký</th><th>Mã lớp</th><th>MSSV</th><th>Trạng thái</th><th>Ngày đăng ký</th></tr></thead>
              <tbody>
                {enrollLoading && <tr><td colSpan={5} className="badge">Đang tải...</td></tr>}
                {!enrollLoading && enrollList.map((row) => (
                  <tr key={row.ma_dang_ky}>
                    <td>{row.ma_dang_ky}</td><td>{row.ma_lop}</td><td>{row.mssv}</td><td>{row.trang_thai}</td>
                    <td>{row.ngay_dang_ky ? row.ngay_dang_ky.replace("T"," ").slice(0,19) : ""}</td>
                  </tr>
                ))}
                {!enrollLoading && enrollList.length === 0 && <tr><td colSpan={5} className="badge">Chưa có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="input" style={{ ...inputStyle, maxWidth: 240 }} placeholder="Tìm theo mã, tên lớp, phòng..." value={keyword} onChange={(e) => setKw(e.target.value)} />
          {isAdmin && (
            <>
              <input className="input" style={{ ...inputStyle, maxWidth: 200 }} placeholder="Mã giảng viên (lọc lớp dạy)" value={filterGV} onChange={(e) => setFilterGV(e.target.value)} />
              <input className="input" style={{ ...inputStyle, maxWidth: 200 }} placeholder="MSSV (lọc lớp đã đăng ký)" value={filterMSSV} onChange={(e) => setFilterMSSV(e.target.value)} />
              <button className="btn" style={btnPrimary} onClick={() => load(1, keyword, { ma_giang_vien: filterGV, mssv: "" })}>Tải lớp theo giảng viên</button>
              <button className="btn" style={btnPrimary} onClick={() => load(1, keyword, { mssv: filterMSSV, ma_giang_vien: "" })}>Tải lớp theo sinh viên</button>
              <label className="btn" style={{ ...btnPrimary, cursor: "pointer" }}>
                {importing ? "Đang import..." : "Import CSV lớp"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    e.target.value = "";
                  }}
                  disabled={importing}
                />
              </label>
              {importMsg && <span className="badge">{importMsg}</span>}
            </>
          )}
          <div className="badge">Tổng: {total}</div>
        </div>

        <table className="table" style={{ minWidth: 960 }}>
          <thead><tr><th>Mã lớp</th><th>Tên môn</th><th>Phòng</th><th>Ngày học</th>{isAdmin && <th>Giảng viên</th>}<th>Thời gian</th>{isAdmin && <th>Hành động</th>}</tr></thead>
          <tbody>
            {items.map((x) => (
              <tr key={x._id} style={{ cursor: "pointer" }} onClick={() => onSelectClass(x)}>
                <td>{x.ma_lop || x._id}</td>
                <td>{canEditRows ? <input className="input" value={x.ten_mon_hoc || ""} onChange={(e) => updateClass(x._id, { ten_mon_hoc: e.target.value })}/> : <div>{x.ten_mon_hoc}</div>}</td>
                <td>{canEditRows ? <input className="input" value={x.phong_hoc || ""} onChange={(e) => updateClass(x._id, { phong_hoc: e.target.value })}/> : <div>{x.phong_hoc}</div>}</td>
                <td style={{ minWidth: 130 }}>
                  {canEditRows ? (
                    <select className="input" style={inputStyle} value={x.draft_day || ""} onChange={(e) => updateClass(x._id, { draft_day: e.target.value, ngay_hoc: e.target.value })}>
                      <option value="">Chọn thứ</option>
                      {DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  ) : (
                    <div className="badge">{dayMap[String(x.ngay_hoc)] || "Chưa đặt"}</div>
                  )}
                </td>
                {isAdmin && (
                  <td style={{ minWidth: 170 }}>
                    {canEditRows ? (
                      <>
                        <select className="input" style={inputStyle} value={x.draft_ma_gv || ""} onChange={(e) => updateClass(x._id, { draft_ma_gv: e.target.value, ma_giang_vien: e.target.value })}>
                          <option value="">Chọn giảng viên</option>
                          {teachers.map((gv) => <option key={gv.ma_giang_vien} value={gv.ma_giang_vien}>{gv.ho_ten || gv.ma_giang_vien}</option>)}
                        </select>
                        <div className="badge" style={{ marginTop: 4 }}>
                          {teachers.find((t) => t.ma_giang_vien === x.ma_giang_vien)?.ho_ten || x.ten_giang_vien || x.ma_giang_vien || "Chưa có tên"}
                        </div>
                      </>
                    ) : (
                      <div className="badge" style={{ marginTop: 4 }}>
                        {teachers.find((t) => t.ma_giang_vien === x.ma_giang_vien)?.ho_ten || x.ten_giang_vien || x.ma_giang_vien || "Chưa có tên"}
                      </div>
                    )}
                  </td>
                )}
                  <td style={{ minWidth: 260 }}>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
                    {formatRange(slotMap[x.slotStart]?.start || x.thoi_gian_bat_dau, slotMap[x.slotEnd]?.end || x.thoi_gian_ket_thuc)}
                  </div>
                  {canEditRows && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <select className="input" style={inputStyle} value={x.slotStart || ""} onChange={(e) => updateClass(x._id, { slotStart: e.target.value, thoi_gian_bat_dau: slotMap[e.target.value]?.start || "" })}>
                        <option value="">Tiết bắt đầu</option>
                        {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <select className="input" style={inputStyle} value={x.slotEnd || ""} onChange={(e) => updateClass(x._id, { slotEnd: e.target.value, thoi_gian_ket_thuc: slotMap[e.target.value]?.end || "" })}>
                        <option value="">Tiết kết thúc</option>
                        {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  )}
                </td>
                {isAdmin && (
                  <td className="actions">
                    <>
                      <button className="btn" style={btnPrimary} onClick={() => onSave(x)}>Lưu</button>
                      <button className="btn" onClick={() => onDelete(x)} style={{ background: "#b91c1c" }}>Xóa</button>
                    </>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={isAdmin ? 7 : 5} className="badge">Chưa có dữ liệu</td></tr>}
          </tbody>
        </table>

        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn" style={btnPrimary} disabled={page <= 1} onClick={() => load(page - 1, keyword)}>Trước</button>
          <div className="badge">Trang {page}/{totalPages}</div>
          <button className="btn" style={btnPrimary} disabled={page >= totalPages} onClick={() => load(page + 1, keyword)}>Tiếp</button>
        </div>
      </div>

      {selectedClass && !isSV && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 12 }}>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Sinh viên trong lớp {selectedClass._id}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Bấm vào lớp để xem; dữ liệu lấy từ đăng ký lớp.</div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Mã ĐK</th><th>MSSV</th><th>Họ tên</th><th>Lớp</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {studentsOfClass.map((sv) => (
                    <tr key={sv.ma_dang_ky}>
                      <td>{sv.ma_dang_ky}</td><td>{sv.mssv}</td><td>{sv.ho_ten}</td><td>{sv.lop}</td><td>{sv.trang_thai}</td>
                    </tr>
                  ))}
                  {!studentsOfClass.length && <tr><td colSpan={5} className="badge">Chưa có sinh viên đăng ký</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Lịch sử điểm danh lớp {selectedClass._id}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Tối đa 200 bản ghi mới nhất.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={btnPrimary} type="button" onClick={() => fetchAttendance(selectedClass._id)}>Tải lại</button>
                <button className="btn" type="button" onClick={() => exportAttendance(selectedClass._id)}>Export CSV</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Mã LS</th><th>MSSV</th><th>Họ tên</th><th>Thời gian</th><th>Trạng thái</th><th>Trễ (phút)</th></tr></thead>
                <tbody>
                  {attendances.map((a) => (
                    <tr key={a.ma_lich_su}>
                      <td>{a.ma_lich_su}</td><td>{a.mssv}</td><td>{a.ho_ten}</td><td>{a.thoi_gian_diem_danh?.replace("T"," ").slice(0,19)}</td><td>{statusPill(a.trang_thai_diem_danh)}</td><td>{a.so_phut_di_tre ?? "-"}</td>
                    </tr>
                  ))}
                  {!attendances.length && <tr><td colSpan={6} className="badge">Chưa có lịch sử</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="badge">
              Liên kết điểm danh: <a href="/diem-danh" target="_blank" rel="noreferrer">/diem-danh</a> (nhập mã lớp {selectedClass._id} để chạy)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
