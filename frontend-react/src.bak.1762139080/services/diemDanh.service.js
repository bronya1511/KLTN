import { pool } from "../config/db.js";
import { DiemDanh } from "../models/diemDanh.model.js";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// helper: lay mssv tu python hoac query ?mssv=...
async function recognizeMSSV({ preferMSSV }) {
  if (preferMSSV) return { mssv: preferMSSV, conf: null, imgPath: null };

  const PYTHON = process.env.PYTHON_BIN || "python3";
  const FACE_DIR = process.env.PYTHON_FACE_DIR || "../python-face";
  const script = `${FACE_DIR}/Recognize.py`;

  try {
    // yeu cau script in JSON: {"mssv":"21521206","conf":87,"img_path":"/path/to.jpg"}
    const { stdout } = await execFileAsync(PYTHON, [script, "--once"], { timeout: 20000 });
    // thu chuyen doi ra JSON; neu that bai thi coi nhu mssv la dong in ra
    let out = stdout.trim();
    try {
      const obj = JSON.parse(out);
      return { mssv: obj.mssv || String(obj.label || "").trim(), conf: obj.conf ?? null, imgPath: obj.img_path ?? null };
    } catch {
      // fallback: dong dau tien la mssv
      const first = out.split(/\r?\n/)[0].trim();
      return { mssv: first, conf: null, imgPath: null };
    }
  } catch (e) {
    throw new Error("Nhan dien khuon mat that bai");
  }
}

// helper: dam bao sinh vien ton tai (auto create neu cho phep)
async function ensureStudent(mssv) {
  const [rows] = await pool.query("SELECT mssv FROM sinh_vien WHERE mssv=?", [mssv]);
  if (rows.length) return true;

  const allowAuto = (process.env.AUTO_CREATE_SV || "1") !== "0";
  if (!allowAuto) return false;

  // tao placeholder toi thieu de he thong ghi nhan diem danh, sau chinh sua sau
  await pool.query(
    "INSERT INTO sinh_vien (mssv, ho_ten) VALUES (?, ?) ON DUPLICATE KEY UPDATE cap_nhat_luc=cap_nhat_luc",
    [mssv, "Chua ro ten"]
  );
  return true;
}

export const diemDanhService = {
  // danh sach log (paginate)
  async listLogs({ offset = 0, limit = 50 }) {
    return await DiemDanh.logList({ offset, limit });
  },

  // auto checkin bang nhan dien khuon mat
  async checkinByFace({ maybeMSSV }) {
    // 1) Lay mssv
    const { mssv, conf, imgPath } = await recognizeMSSV({ preferMSSV: maybeMSSV });
    if (!mssv) throw new Error("Khong nhan duoc mssv");

    // 2) Dam bao SV ton tai (co the tu dong tao)
    const ok = await ensureStudent(mssv);
    if (!ok) {
      const err = new Error("Khong tim thay sinh vien");
      err.status = 404;
      throw err;
    }

    // 3) Tim lop dang dien ra (neu frontend chon lop thi ban co the truyen ma_lop; tam thoi lay lop gan nhat trong dang_ky_lop)
    // Don gian: chon 1 lop bat ky SV da dang ky (uu tien lop moi tao)
    let ma_lop = null;
    try {
      const [rows] = await pool.query(
        "SELECT dkl.ma_lop FROM dang_ky_lop dkl JOIN lop_hoc lh ON dkl.ma_lop=lh.ma_lop WHERE dkl.mssv=? ORDER BY lh.ma_lop DESC LIMIT 1",
        [mssv]
      );
      if (rows.length) ma_lop = rows[0].ma_lop;
    } catch {}

    // fallback neu chua dang ky lop nao
    if (!ma_lop) {
      const [any] = await pool.query("SELECT ma_lop FROM lop_hoc ORDER BY ma_lop DESC LIMIT 1");
      if (any.length) ma_lop = any[0].ma_lop;
      else ma_lop = "LOP-TEST";
    }

    // 4) Ghi nhan diem danh (bang `diem_danh`) + tuy chon anh/chung cu
    const thoi_gian = new Date();
    await pool.query(
      "INSERT INTO diem_danh (mssv, ma_lop, thoi_gian_diem_danh, ma_thiet_bi, do_tin_cay, duong_dan_anh, phien_ban_mo_hinh, nguon_nhan_dien, trang_thai) VALUES (?,?,?,?,?,?,?, 'face', 'Hop le')",
      [mssv, ma_lop, thoi_gian, process.env.THANH_THIET_BI || "pi5-cam-01", conf ?? null, imgPath ?? null, process.env.MODEL_VER || null]
    );

    // 5) Ghi vao lich_su_diem_danh de hien log
    await pool.query(
      "INSERT INTO lich_su_diem_danh (mssv, ma_lop, thoi_gian_diem_danh, ma_thiet_bi, do_tin_cay, duong_dan_anh, phien_ban_mo_hinh, nguon_nhan_dien, trang_thai) VALUES (?,?,?,?,?,?,?, 'face', 'Hop le')",
      [mssv, ma_lop, thoi_gian, process.env.THANH_THIET_BI || "pi5-cam-01", conf ?? null, imgPath ?? null, process.env.MODEL_VER || null]
    );

    return { mssv, ma_lop, thoi_gian };
  },
};
