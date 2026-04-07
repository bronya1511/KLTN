import { API_BASE } from "./api";

export const endpoints = {
  sinhVien: {
    list: () => `${API_BASE}/api/sinh-vien`,
    byId: (id) => `${API_BASE}/api/sinh-vien/${encodeURIComponent(id)}`, // id = mssv
  },
  lopHoc: {
    list: () => `${API_BASE}/api/lop-hoc`,
  },
  face: {
    enroll: (mssv) => `${API_BASE}/api/sinh-vien?mssv=${encodeURIComponent(mssv)}`,
    train: () => `${API_BASE}/api/face/train`,
    status: () => `${API_BASE}/api/face/status`,
  },
  diemDanh: {
    auto: (mssv) => `${API_BASE}/api/diem-danh/auto${mssv ? `?mssv=${encodeURIComponent(mssv)}` : ""}`,
    logs: (page=1,limit=50)=>`${API_BASE}/api/diem-danh/logs?page=${page}&limit=${limit}`,
  }
};
