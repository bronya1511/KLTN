import { pool } from "../config/db.js";

export const LopHoc = {
  async list({ keyword = "", ma_giang_vien, mssv, page = 1, limit = 50 } = {}) {
    const kw = String(keyword || "").trim();
    const filters = [];
    const params = [];

    if (kw) {
      filters.push("(lh.ma_lop LIKE ? OR lh.ten_mon_hoc LIKE ? OR lh.phong_hoc LIKE ?)");
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
    }
    if (ma_giang_vien) {
      filters.push("lh.ma_giang_vien = ?");
      params.push(ma_giang_vien);
    }
    if (mssv) {
      // tham gia qua dang_ky_lop
      filters.push("EXISTS (SELECT 1 FROM dang_ky_lop dkl WHERE dkl.ma_lop=lh.ma_lop AND dkl.mssv=? AND dkl.trang_thai='Da dang ky')");
      params.push(mssv);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const p = Math.max(1, Number(page) || 1);
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const off = (p - 1) * lim;

    const [rows] = await pool.query(
      `SELECT lh.*, gv.ho_ten AS ten_giang_vien
       FROM lop_hoc lh
       LEFT JOIN giang_vien gv ON gv.ma_giang_vien = lh.ma_giang_vien
       ${where}
       ORDER BY lh.ma_lop DESC
       LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
    const [[{ c: total }]] = await pool.query(
      `SELECT COUNT(*) AS c FROM lop_hoc lh ${where}`,
      params
    );

    return { items: rows, total, page: p, limit: lim };
  },

  async get(ma_lop) {
    const [rows] = await pool.query(
      `SELECT lh.*, gv.ho_ten AS ten_giang_vien
       FROM lop_hoc lh
       LEFT JOIN giang_vien gv ON gv.ma_giang_vien = lh.ma_giang_vien
       WHERE lh.ma_lop=?`,
      [ma_lop]
    );
    return rows[0];
  },

  async create(data) {
    await pool.query("INSERT INTO lop_hoc SET ?", [data]);
    return { ma_lop: data.ma_lop, ...data };
  },

  async update(ma_lop, data) {
    const conn = await pool.getConnection();
    const { new_ma_lop, ...rest } = data || {};
    let target = ma_lop;

    try {
      await conn.beginTransaction();

      if (new_ma_lop && new_ma_lop !== ma_lop) {
        const [[dup]] = await conn.query("SELECT ma_lop FROM lop_hoc WHERE ma_lop=?", [new_ma_lop]);
        if (dup) {
          await conn.rollback();
          throw new Error("Ma lop moi da ton tai");
        }
        const tables = ["dang_ky_lop", "diem_danh", "lich_su_diem_danh"];
        for (const tbl of tables) {
          await conn.query(`UPDATE ${tbl} SET ma_lop=? WHERE ma_lop=?`, [new_ma_lop, ma_lop]);
        }
        await conn.query("UPDATE lop_hoc SET ma_lop=? WHERE ma_lop=?", [new_ma_lop, ma_lop]);
        target = new_ma_lop;
      }

      if (Object.keys(rest).length) {
        await conn.query("UPDATE lop_hoc SET ? WHERE ma_lop=?", [rest, target]);
      }

      await conn.commit();
      return this.get(target);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async remove(ma_lop) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[dangKy]] = await conn.query("SELECT COUNT(*) AS c FROM dang_ky_lop WHERE ma_lop=?", [ma_lop]);
      const [[diemDanh]] = await conn.query("SELECT COUNT(*) AS c FROM diem_danh WHERE ma_lop=?", [ma_lop]);
      const [[lichSu]] = await conn.query("SELECT COUNT(*) AS c FROM lich_su_diem_danh WHERE ma_lop=?", [ma_lop]);
      const totalRef = (dangKy?.c || 0) + (diemDanh?.c || 0) + (lichSu?.c || 0);

      // luôn xóa cascade (người dùng đã xác nhận ở tầng trên)
      if (totalRef > 0) {
        await conn.query("DELETE FROM dang_ky_lop WHERE ma_lop=?", [ma_lop]);
        await conn.query("DELETE FROM diem_danh WHERE ma_lop=?", [ma_lop]);
        await conn.query("DELETE FROM lich_su_diem_danh WHERE ma_lop=?", [ma_lop]);
      }

      await conn.query("DELETE FROM lop_hoc WHERE ma_lop=?", [ma_lop]);
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async students(ma_lop) {
    const [rows] = await pool.query(
      `SELECT dkl.ma_dang_ky, dkl.mssv, dkl.trang_thai, dkl.ngay_dang_ky,
              sv.ho_ten, sv.email, sv.lop, sv.so_dien_thoai
       FROM dang_ky_lop dkl
       LEFT JOIN sinh_vien sv ON sv.mssv = dkl.mssv
       WHERE dkl.ma_lop=?
       ORDER BY dkl.ngay_dang_ky DESC`,
      [ma_lop]
    );
    return rows;
  },

  async attendance(ma_lop, { limit = 100, offset = 0 } = {}) {
    const lim = Math.max(1, Math.min(500, Number(limit) || 100));
    const off = Math.max(0, Number(offset) || 0);
    const [rows] = await pool.query(
      `SELECT lsd.ma_lich_su, lsd.mssv, lsd.ho_ten, lsd.ma_lop,
              lsd.trang_thai_diem_danh, lsd.thoi_gian_diem_danh,
              lsd.ma_thiet_bi, lsd.do_tin_cay, lsd.so_phut_di_tre
       FROM lich_su_diem_danh lsd
       WHERE lsd.ma_lop=?
       ORDER BY lsd.thoi_gian_diem_danh DESC
       LIMIT ? OFFSET ?`,
      [ma_lop, lim, off]
    );
    return rows;
  }
};
