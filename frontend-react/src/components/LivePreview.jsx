import React, { useEffect, useMemo, useState } from "react";
import { useLiveSocket } from "../hooks/useLiveSocket";

const formatTime = (value) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
};

export default function LivePreview() {
  const socket = useLiveSocket();
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [streamError, setStreamError] = useState(null);
  const streamUrl = useMemo(() => {
    return (
      import.meta.env.VITE_FACE_STREAM_URL ||
      `http://${window.location.hostname}:5002/api/face/stream`
    );
  }, []);

  useEffect(() => {
    const handle = (type) => (payload = {}) => {
      const event = {
        type,
        at: payload.time || new Date().toISOString(),
        sv: payload.sv || { mssv: payload.mssv, ho_ten: payload.ho_ten },
        lop: payload.lop || { ma_lop: payload.ma_lop, ten_mon_hoc: payload.ten_mon_hoc },
        raw: payload
      };
      setLatest(event);
      setHistory((prev) => [event, ...prev].slice(0, 6));
    };
    const onCheckin = handle("checkin");
    const onCheckout = handle("checkout");
    socket.on("checkin", onCheckin);
    socket.on("checkout", onCheckout);
    return () => {
      socket.off("checkin", onCheckin);
      socket.off("checkout", onCheckout);
    };
  }, [socket]);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div
        style={{
          flex: "1 1 280px",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          minWidth: 260
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Live preview</p>
        <div
          style={{
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            marginBottom: 12,
            minHeight: 200,
            background: "#f8fafc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          {streamError ? (
            <div style={{ fontSize: 13, color: "#9ca3af", padding: 12 }}>{streamError}</div>
          ) : (
            <img
              src={streamUrl}
              alt="Camera livestream"
              style={{ width: "100%", objectFit: "cover" }}
              onError={() => setStreamError("Không thể tải luồng camera. Kiểm tra service /api/face/stream.")}
            />
          )}
        </div>
        {latest ? (
          <div style={{ lineHeight: 1.6 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
              {latest.type === "checkin" ? "Check-in" : "Check-out"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{latest.sv?.ho_ten || "-"}</div>
            <div style={{ fontSize: 14, color: "#4b5563" }}>{latest.sv?.mssv || "-"}</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
              Lớp: <strong>{latest.lop?.ten_mon_hoc || latest.lop?.ma_lop || "-"}</strong>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{formatTime(latest.at)}</div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#9ca3af" }}>Chưa có sự kiện realtime nào.</p>
        )}
      </div>

      <div
        style={{
          flex: "1 1 280px",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          minWidth: 260
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Sự kiện vừa diễn ra</p>
        {history.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Đang đợi tín hiệu từ camera...</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {history.map((ev, idx) => (
              <li
                key={`${ev.raw?.mssv || idx}-${idx}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 10
                }}
              >
                <div style={{ fontSize: 12, textTransform: "uppercase", color: "#6b7280" }}>
                  {ev.type === "checkin" ? "Check-in" : "Check-out"}
                </div>
                <div style={{ fontWeight: 600 }}>{ev.sv?.ho_ten || "-"}</div>
                <div style={{ fontSize: 13 }}>{ev.sv?.mssv || "-"}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{formatTime(ev.at)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
