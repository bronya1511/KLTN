import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { endpoints } from "../services/endpoints";

const fmtTime = (value) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
};

export default function DiemDanh() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgDelete, setMsgDelete] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classes, setClasses] = useState([]);
  const snapshotUrl = "/api/face/snapshot";
  const [snapshotTick, setSnapshotTick] = useState(0);
  const [user] = useState(() => {
    if (typeof localStorage === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const isSV = user?.role === "sinh_vien";
  const isAdmin = user?.role === "admin";
  const isGV = user?.role === "giang_vien";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoints.diemDanh.logs({ page: 1, limit: 50 }));
      setLogs(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (ma_lich_su) => {
    if (!ma_lich_su) return;
    if (!confirm(`Xóa lịch sử ${ma_lich_su}?`)) return;
    try {
      setMsgDelete("");
      await api.delete(endpoints.diemDanh.deleteLog(ma_lich_su));
      await load();
    } catch (e) {
      setMsgDelete(String(e?.message || e));
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/face/recognize/status");
      const data = await res.json();
      setRunning(!!data.running);
    } catch {
      setRunning(false);
    }
  };

  const startRecognize = async () => {
    setMsg("");
    try {
      const code = isGV ? classCode : classCode.trim();
      if (!code) return setMsg("Vui lòng chọn/nhập mã lớp trước khi bắt đầu.");
      const res = await fetch("/api/face/recognize/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode: code })
      });
      if (!res.ok) throw new Error(await res.text());
      setRunning(true);
      setMsg(`Đã bật điểm danh tự động cho lớp ${code}.`);
    } catch (e) {
      setMsg("Không thể bật: " + (e?.message || e));
    }
  };

  const stopRecognize = async () => {
    setMsg("");
    try {
      const res = await fetch("/api/face/recognize/stop", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setRunning(false);
      setMsg("Đã dừng điểm danh tự động.");
    } catch (e) {
      setMsg("Không thể dừng: " + (e?.message || e));
    }
  };

  useEffect(() => {
    load();
    checkStatus();
    // Nếu admin hoặc giảng viên -> tải danh sách lớp để chọn nhanh
    async function loadSelectableClasses() {
      if (!isGV && !isAdmin) return;
      try {
        const qs = new URLSearchParams({ page: 1, limit: 200 });
        if (isGV && user?.ma_giang_vien) qs.set("ma_giang_vien", user.ma_giang_vien);
        const { data } = await api.get(`${endpoints.lopHoc.list()}?${qs.toString()}`);
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : data || [];
        setClasses(list);
      } catch {
        setClasses([]);
      }
    }
    loadSelectableClasses();
    const timer = setInterval(() => {
      load();
      checkStatus();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSnapshotTick((x) => x + 1), 1200); // refresh ảnh ~1.2s/lần
    return () => clearInterval(t);
  }, [running]);

  const cardStyle = {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb"
  };

  const tableWrapper = { overflowX: "auto" };
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
    borderRadius: 12,
    overflow: "hidden"
  };
  const thStyle = {
    textAlign: "left",
    fontWeight: "600",
    background: "#f8fafc",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb"
  };
  const tdStyle = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9" };
  const latest = logs[0] || null;

  const statusPill = (text) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        background: text === "Hop le" ? "#ecfdf3" : "#fef2f2",
        color: text === "Hop le" ? "#15803d" : "#b91c1c",
        border: `1px solid ${text === "Hop le" ? "#bbf7d0" : "#fecdd3"}`
      }}
    >
      <span>{text === "Hop le" ? "🟢" : "⚠️"}</span>
      <span>{text || "Chưa rõ"}</span>
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          padding: "18px 20px",
          borderRadius: 16,
          background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
          color: "#fff",
          boxShadow: "0 25px 40px rgba(14,165,233,0.25)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.2 }}>Điểm danh</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>
              Theo dõi trạng thái, kích hoạt nhận diện và xem lịch sử gần nhất.
            </div>
          </div>
          {!isSV && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: "rgba(255,255,255,0.15)",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.25)"
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.9 }}>Trạng thái</div>
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: running ? "rgba(187, 247, 208, 0.25)" : "rgba(254, 242, 242, 0.35)",
                  color: running ? "#bbf7d0" : "#fecdd3",
                  border: "1px solid rgba(255,255,255,0.35)",
                  fontWeight: 700
                }}
              >
                {running ? "Đang chạy" : "Đã dừng"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Điểm danh thủ công: chỉ admin/giảng viên, ẩn với sinh viên */}
      {!isSV && (
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>Điểm danh thủ công</p>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              Nhập mã lớp, bật nhận diện và theo dõi kết quả. Live preview đã được ẩn khỏi luồng chính để nhẹ hơn.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              background: "#f8fafc",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e2e8f0"
            }}
          >
            {(isGV || isAdmin) && (
              <select
                className="input"
                style={{ maxWidth: 260 }}
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                disabled={running}
              >
                <option value="">{isAdmin ? "Chọn lớp (admin thấy tất cả)" : "Chọn lớp đang dạy"}</option>
                {classes.map((c) => (
                  <option key={c.ma_lop} value={c.ma_lop}>{c.ma_lop} - {c.ten_mon_hoc}</option>
                ))}
              </select>
            )}
            {isAdmin && (
              <input
                className="input"
                style={{ maxWidth: 200 }}
                placeholder="Hoặc nhập mã lớp"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                disabled={running}
              />
            )}
            {!isGV && !isAdmin && (
              <input
                className="input"
                style={{ maxWidth: 200 }}
                placeholder="Nhập mã lớp (vd: CE304)"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                disabled={running}
              />
            )}
            <button className="btn" onClick={startRecognize} disabled={running}>
              Bắt đầu
            </button>
            <button
              className="btn"
              style={{ background: "#b91c1c" }}
              onClick={stopRecognize}
              disabled={!running}
            >
              Dừng
            </button>
          </div>
          {(isGV || isAdmin) && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {running ? "Đang chạy, bấm Dừng để đổi lớp." :
                classes.length ? "Chọn lớp hoặc nhập mã rồi Bắt đầu." : "Chưa tải được danh sách lớp, bạn có thể nhập mã lớp thủ công."}
            </div>
          )}
          {msg && <div className="badge" style={{ color: "#b91c1c" }}>{msg}</div>}

          {running && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  background: "#0f172a",
                }}
              >
                <img
                  src={`${snapshotUrl}?t=${snapshotTick}`}
                  alt="Camera điểm danh"
                  style={{ width: "100%", maxHeight: 480, objectFit: "contain", background: "#0f172a" }}
                />
                {latest && (
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      bottom: 8,
                      background: "#d1fae5",
                      color: "#065f46",
                      borderRadius: 8,
                      padding: "8px 12px",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>✅</span>
                    <div style={{ fontWeight: 700 }}>{latest.ho_ten || latest.mssv || "Đang nhận diện..."}</div>
                    <div style={{ fontSize: 13, color: "#064e3b" }}>
                      {latest.mssv ? `MSSV: ${latest.mssv}` : ""}
                      {latest.do_tin_cay ? ` • Độ tin cậy: ${latest.do_tin_cay}%` : ""}
                      {latest.so_phut_di_tre ? ` • Trễ ${latest.so_phut_di_tre} phút` : ""}
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc"
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Kết quả nhận diện gần nhất</div>
                {latest ? (
                  <div style={{ lineHeight: 1.6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{latest.ho_ten || "Chưa rõ tên"}</div>
                    <div style={{ fontSize: 14, color: "#475569" }}>MSSV: {latest.mssv}</div>
                    <div style={{ fontSize: 14 }}>Lớp: {latest.ma_lop}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{fmtTime(latest.thoi_gian_diem_danh)}</div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "#0f172a" }}>
                      {latest.so_phut_di_tre ? `Trễ: ${latest.so_phut_di_tre} phút` : "Đúng giờ"}
                    </div>
                    <div style={{ marginTop: 6 }}>{statusPill(latest.trang_thai_diem_danh)}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Chưa có bản ghi nào.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            alignItems: "center",
          }}
        >
          <h3 style={{ fontWeight: 600, fontSize: 18 }}>Lịch sử điểm danh gần đây</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {msgDelete && <span className="badge" style={{ color: "#b91c1c" }}>{msgDelete}</span>}
            {loading && <span style={{ fontSize: 12, color: "#6b7280" }}>Đang tải...</span>}
          </div>
        </div>
        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Mã lịch sử</th>
                <th style={thStyle}>Sinh viên</th>
                <th style={thStyle}>Lớp</th>
                <th style={thStyle}>Thời gian</th>
                <th style={thStyle}>Đi trễ (phút)</th>
                <th style={thStyle}>Trạng thái</th>
                {!isSV && <th style={thStyle}>Hành động</th>}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.ma_lich_su}
                  style={{ transition: "background 0.2s", background: l.trang_thai_diem_danh === "Hop le" ? "#fff" : "#fff7ed" }}
                >
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                    {l.ma_lich_su}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{l.mssv}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{l.ho_ten}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{l.ma_lop}</div>
                  </td>
                  <td style={tdStyle}>{fmtTime(l.thoi_gian_diem_danh)}</td>
                  <td style={tdStyle}>
                    {l.so_phut_di_tre ?? "-"}
                  </td>
                  <td style={tdStyle}>
                    {statusPill(l.trang_thai_diem_danh)}
                  </td>
                  {!isSV && (
                    <td style={{ ...tdStyle, width: 110 }}>
                      <button
                        className="btn"
                        style={{ background: "#b91c1c" }}
                        onClick={() => deleteLog(l.ma_lich_su)}
                      >
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!logs.length && !loading && (
                <tr>
                  <td colSpan={isSV ? 6 : 7} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>
                    Chưa có dữ liệu điểm danh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
