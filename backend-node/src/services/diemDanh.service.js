import { DiemDanh } from "../models/diemDanh.model.js";
import { sendMail } from "../utils/email.js";
import { nowVN } from "../utils/time.js";
import { pool } from "../config/db.js";
import { io } from "../sockets/live.js";

const DEFAULT_DEVICE_ID = process.env.DEVICE_ID || "pi5-cam-01";
const PERIOD_MINUTES = Number(process.env.PERIOD_MINUTES || 45); // 1 tiết = 45 phút

function timeStringToMinutes(val) {
  if (!val) return null;
  const s = String(val).trim();
  // TIME: "07:30:00" -> split
  const parts = s.split(":");
  if (parts.length >= 2 && parts[0].length <= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 60 + m;
  }
  // ISO/datetime: use Date
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.getHours() * 60 + d.getMinutes();
  }
  return null;
}

function minutesVNNow() {
  // Dùng luôn giờ hiện tại của máy chủ (không bù offset)
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

async function getSinhVienByMSSV(mssv) {
  if (!mssv) return null;
  const [rows] = await pool.query(
    "SELECT mssv, ho_ten, email, so_dien_thoai FROM sinh_vien WHERE mssv=? LIMIT 1",
    [mssv]
  );
  return rows[0] || null;
}

async function getLopHocByMa(ma_lop) {
  if (!ma_lop) return null;
  const [rows] = await pool.query("SELECT * FROM lop_hoc WHERE ma_lop=? LIMIT 1", [ma_lop]);
  return rows[0] || null;
}

async function getLatestRegisteredClass(mssv) {
  const [rows] = await pool.query(
    `SELECT dkl.ma_lop
     FROM dang_ky_lop dkl
     WHERE dkl.mssv=? AND dkl.trang_thai='Da dang ky'
     ORDER BY dkl.ngay_dang_ky DESC
     LIMIT 1`,
    [mssv]
  );
  if (!rows[0]) return null;
  return getLopHocByMa(rows[0].ma_lop);
}

async function ensureLopHoc({ requestedMaLop, mssv }) {
  const prefer = await getLopHocByMa(requestedMaLop);
  if (prefer) return prefer;
  const registered = await getLatestRegisteredClass(mssv);
  if (registered) return registered;
  const [fallback] = await pool.query("SELECT * FROM lop_hoc ORDER BY ma_lop ASC LIMIT 1");
  return fallback[0] || null;
}

async function recordEvent({ sv, lop, action = "checkin", metadata = {} }) {
  const time = nowVN();
  const nowHM = minutesVNNow();
  const startM = timeStringToMinutes(lop?.thoi_gian_bat_dau);
  const endM = timeStringToMinutes(lop?.thoi_gian_ket_thuc);
  const missingSchedule = startM === null || endM === null || nowHM === null;
  const lateMinutes = !missingSchedule ? Math.max(0, nowHM - startM) : null;
  const lateOnePeriod = lateMinutes !== null && lateMinutes >= PERIOD_MINUTES;
  const outside = missingSchedule || nowHM < startM || nowHM > endM;

  let status = metadata.trang_thai || "Hop le";
  if (lateOnePeriod) status = "Gian lan";
  else if (outside) status = "Gian lan";

  const ma_diem_danh = await DiemDanh.checkin({
    mssv: sv.mssv,
    ma_lop: lop.ma_lop,
    thoi_gian_diem_danh: time,
    ma_thiet_bi: metadata.ma_thiet_bi || DEFAULT_DEVICE_ID,
    do_tin_cay: metadata.do_tin_cay ?? null,
    so_phut_di_tre: lateMinutes,
    trang_thai: status
  });

  const payload = {
    ma_diem_danh,
    action,
    mssv: sv.mssv,
    ho_ten: sv.ho_ten,
    email: sv.email,
    ma_lop: lop.ma_lop,
    ten_mon_hoc: lop.ten_mon_hoc,
    phong_hoc: lop.phong_hoc,
    thoi_gian: time,
    do_tin_cay: metadata.do_tin_cay ?? null,
    trang_thai: status,
    so_phut_di_tre: lateMinutes
  };

  if (sv.email) {
    const isCheat = status === "Gian lan";
    const subject = isCheat
      ? `[Cảnh báo] Điểm danh nghi vấn (${lop.ma_lop})`
      : action === "checkout"
        ? "Xác nhận checkout"
        : "Xác nhận checkin";
    const actionLabel = action === "checkout" ? "checkout khỏi" : "checkin vào";
    const lateNote =
      lateMinutes && lateMinutes > 0
        ? `<p style="color:#b45309;">Đi trễ: ${lateMinutes} phút.</p>`
        : "";
    const extra = isCheat
      ? `<p style="color:#b91c1c;font-weight:bold;">Trạng thái: ${status}. Vui lòng liên hệ giảng viên/ban quản trị nếu đây là nhầm lẫn.</p>`
      : `<p style="color:#15803d;font-weight:bold;">Trạng thái: ${status}.</p>`;
    await sendMail({
      to: sv.email,
      subject,
      html: `<p>Chào ${sv.ho_ten},</p>
             <p>Bạn vừa ${actionLabel} lớp ${lop.ten_mon_hoc} (${lop.ma_lop}) lúc ${time}.</p>
             ${lateNote}
             ${extra}`
    });
  }


  try {
    const socket = io();
    if (socket) socket.emit(action === "checkout" ? "checkout" : "checkin", payload);
  } catch {
    // socket server chua khoi tao -> bo qua
  }

  return payload;
}

export const diemDanhService = {
  async checkinByFace({ mssv, ma_lop, ...metadata }) {
    const sv = await getSinhVienByMSSV(mssv);
    if (!sv) {
      const err = new Error("Khong tim thay sinh vien");
      err.status = 404;
      throw err;
    }
    const lop = await ensureLopHoc({ requestedMaLop: ma_lop, mssv: sv.mssv });
    if (!lop) {
      const err = new Error("Khong tim thay lop hoc phu hop");
      err.status = 404;
      throw err;
    }
    return recordEvent({ sv, lop, action: "checkin", metadata });
  },

  async checkoutByFace({ mssv, ma_lop, ...metadata }) {
    const sv = await getSinhVienByMSSV(mssv);
    if (!sv) {
      const err = new Error("Khong tim thay sinh vien");
      err.status = 404;
      throw err;
    }
    const lop = await ensureLopHoc({ requestedMaLop: ma_lop, mssv: sv.mssv });
    if (!lop) {
      const err = new Error("Khong tim thay lop hoc phu hop");
      err.status = 404;
      throw err;
    }
    return recordEvent({ sv, lop, action: "checkout", metadata });
  },

  async listLogs(q) {
    const rows = await DiemDanh.logList(q);
    const lopSet = new Set(rows.map((r) => r.ma_lop).filter(Boolean));
    let lopMap = new Map();
    if (lopSet.size) {
      const [lopRows] = await pool.query(
        `SELECT ma_lop, thoi_gian_bat_dau FROM lop_hoc WHERE ma_lop IN (${Array.from(lopSet)
          .map(() => "?")
          .join(",")})`,
        Array.from(lopSet)
      );
      lopMap = new Map(lopRows.map((l) => [l.ma_lop, l]));
    }

    const minuteFromDatetime = (dt) => {
      if (!dt) return null;
      const str = String(dt);
      // Expect "YYYY-MM-DD HH:mm:ss"
      const parts = str.split(" ")[1] || "";
      const [h, m] = parts.split(":").map((v) => parseInt(v, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };

    return rows.map((r) => {
      const lop = lopMap.get(r.ma_lop);
      const startM = timeStringToMinutes(lop?.thoi_gian_bat_dau);
      const logM = minuteFromDatetime(r.thoi_gian_diem_danh);
      const late = startM !== null && logM !== null ? Math.max(0, logM - startM) : null;
      return { ...r, so_phut_di_tre: late };
    });
  },

  async deleteLog(ma_lich_su) {
    const res = await DiemDanh.deleteLog(ma_lich_su);
    if (!res || res.affectedRows === 0) {
      const err = new Error("Khong tim thay lich su");
      err.status = 404;
      throw err;
    }
    return true;
  }
};
