import React, { useEffect, useState } from "react";
import { useLiveSocket } from "../hooks/useLiveSocket";

export default function LiveBoard() {
  const socket = useLiveSocket();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const onIn = (e) => setEvents((old) => [{ type: "checkin", ...e }, ...old].slice(0, 20));
    const onOut = (e) => setEvents((old) => [{ type: "checkout", ...e }, ...old].slice(0, 20));
    socket.on("checkin", onIn);
    socket.on("checkout", onOut);
    return () => { socket.off("checkin", onIn); socket.off("checkout", onOut); };
  }, [socket]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-2">Sự kiện live</h3>
      <ul className="space-y-2">
        {events.map((ev, i) => (
          <li key={i} className="border rounded p-2">
            <div className="text-sm">Loại: {ev.type}</div>
            <div className="text-sm">SV: {ev.sv?.ho_ten} ({ev.sv?.mssv})</div>
            <div className="text-sm">Lớp: {ev.lop?.ten_lop}</div>
            <div className="text-sm">Thời gian: {ev.time}</div>
         </li>
       ))}
      </ul>
    </div>
  );
}
