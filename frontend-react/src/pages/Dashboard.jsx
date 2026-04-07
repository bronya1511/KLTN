import React from "react";
import LiveBoard from "../components/LiveBoard.jsx";
import AttendanceChart from "../components/AttendanceChart.jsx";

export default function Dashboard() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <LiveBoard />
      <AttendanceChart />
    </div>
  );
}
