// Ghi chu khong dau
// Cac endpoint REST; luon tra ve path bat dau bang /api

export const endpoints = {
  login: () => "/api/auth/login",

  sinhVien: {
    list: () => "/api/sinh-vien",
    byId: (mssv) => `/api/sinh-vien/${encodeURIComponent(mssv)}`,
    // mo rong neu can:
    // khoaHoc: (mssv) => `/api/sinh-vien/${encodeURIComponent(mssv)}/khoa-hoc`,
  },

  lopHoc: {
    list: () => "/api/lop-hoc",
    byId: (ma) => `/api/lop-hoc/${encodeURIComponent(ma)}`,
    students: (ma) => `/api/lop-hoc/${encodeURIComponent(ma)}/students`,
    attendance: (ma, qs = "") =>
      `/api/lop-hoc/${encodeURIComponent(ma)}/attendance${qs ? `?${qs}` : ""}`,
  },

  giangVien: {
    list: () => "/api/giang-vien",
    create: () => "/api/giang-vien",
    byId: (id) => `/api/giang-vien/${encodeURIComponent(id)}`,
    delete: (id) => `/api/giang-vien/${encodeURIComponent(id)}`
  },

  dangKyLop: {
    listByLop: (ma_lop) => `/api/dang-ky-lop/${encodeURIComponent(ma_lop)}`,
    add: () => "/api/dang-ky-lop",
    delete: (ma_dang_ky) => `/api/dang-ky-lop/${encodeURIComponent(ma_dang_ky)}`
  },

  diemDanh: {
    auto: (mssv) =>
      mssv ? `/api/diem-danh/auto?mssv=${encodeURIComponent(mssv)}` : "/api/diem-danh/auto",
    logs: ({ page = 1, limit = 50 } = {}) =>
      `/api/diem-danh/logs?page=${page}&limit=${limit}`,
    deleteLog: (id) => `/api/diem-danh/logs/${encodeURIComponent(id)}`
  },

  face: {
    enroll: () => "/api/face/enroll",
    ping: () => "/api/face/ping",
  },
};
