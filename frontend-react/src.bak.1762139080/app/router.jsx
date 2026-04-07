import React from "react";
import { createBrowserRouter } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary.jsx";
import AppLayout from "../layouts/AppLayout.jsx";

import SinhVienMoi from "../pages/SinhVienMoi.jsx";
import SinhVienList from "../pages/SinhVienList.jsx";
import LopHoc from "../pages/LopHoc.jsx";
import LichSuDiemDanh from "../pages/LichSuDiemDanh.jsx";
import DiemDanhAuto from "../pages/DiemDanhAuto.jsx";

const wrap = (el) => <ErrorBoundary>{el}</ErrorBoundary>;

const router = createBrowserRouter([
  {
    path: "/",
    element: wrap(<AppLayout />),
    children: [
      { index: true, element: wrap(<SinhVienMoi />) },
      { path: "sinh-vien", element: wrap(<SinhVienList />) },
      { path: "lop-hoc", element: wrap(<LopHoc />) },
      { path: "logs", element: wrap(<LichSuDiemDanh />) },
      { path: "auto", element: wrap(<DiemDanhAuto />) },
    ],
  },
]);

export default router;
