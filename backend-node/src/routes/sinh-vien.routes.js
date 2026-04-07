// src/routes/sinh-vien.routes.js (khong dau)
import { Router } from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Ping de kiem tra router duoc mount
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "/api/sinh-vien" });
});

// helper: đồng bộ tài khoản users cho sinh viên
async function syncStudentUser({ username, password, mssv }) {
  const uname = username || mssv;
  if (!uname || !mssv) return;
  const hash = password ? await bcrypt.hash(password, 10) : null;

  // tìm theo mssv hoặc username để cập nhật
  const [rows] = await pool.query("SELECT id FROM users WHERE mssv=? OR username=?", [mssv, uname]);

  // nếu tồn tại record khác với username trùng, cần tránh duplicate
  if (rows[0]) {
    const id = rows[0].id;
    // kiểm tra nếu username đang trùng với user khác id -> thêm hậu tố
    const [[dup]] = await pool.query("SELECT id FROM users WHERE username=? AND id<>?", [uname, id]);
    const safeUsername = dup ? `${uname}_${mssv}` : uname;

    const params = [];
    const sets = ["username=?", "role='sinh_vien'", "mssv=?"];
    params.push(safeUsername, mssv);
    if (hash) { sets.push("password_hash=?"); params.push(hash); }
    params.push(id);
    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=?`, params);
  } else {
    // tránh trùng username khi insert
    let safeUsername = uname;
    const [[dup]] = await pool.query("SELECT id FROM users WHERE username=?", [uname]);
    if (dup) safeUsername = `${uname}_${mssv}`;

    const hashInsert = hash || await bcrypt.hash("123", 10); // mặc định 123 nếu chưa nhập mật khẩu
    await pool.query(
      "INSERT INTO users (username, password_hash, role, mssv) VALUES (?,?, 'sinh_vien', ?)",
      [safeUsername, hashInsert, mssv]
    );
  }
}

// GET /api/sinh-vien?page=&limit=&keyword=
router.get("/", auth(), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "20", 10)));
    const kw    = (req.query.keyword || "").trim();
    const offset = (page - 1) * limit;

    const user = req.user || {};
    // Sinh viên chỉ được xem chính mình
    if (user.role === "sinh_vien") {
      const [rows] = await pool.query(
        "SELECT mssv, ho_ten, email, khoa_hoc, lop, so_dien_thoai, ngay_sinh, khoa, nganh_hoc, tai_khoan, mat_khau FROM sinh_vien WHERE mssv=? LIMIT 1",
        [user.mssv]
      );
      return res.json({ items: rows, page: 1, limit: rows.length || 1, total: rows.length });
    }
    // Giảng viên không có quyền xem toàn bộ danh sách
    if (user.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Khong du quyen" });
    }

    const where = [];
    const params = [];
    if (kw) {
      where.push("(mssv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR khoa_hoc LIKE ?)");
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // KHONG dung placeholder ? cho LIMIT/OFFSET
    const listSql = `
      SELECT mssv, ho_ten, email, khoa_hoc, lop, so_dien_thoai, ngay_sinh, khoa, nganh_hoc,
             tai_khoan, mat_khau
      FROM sinh_vien
      ${whereSql}
      ORDER BY mssv ASC
      LIMIT ${offset}, ${limit}
    `;
    const [rows] = await pool.query(listSql, params);

    const countSql = `SELECT COUNT(*) AS total FROM sinh_vien ${whereSql}`;
    const [[countRow]] = await pool.query(countSql, params);

    res.json({ items: rows, page, limit, total: countRow?.total ?? 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// POST /api/sinh-vien
// Body: { mssv, ho_ten, email, khoa_hoc }
router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const {
      mssv,
      ho_ten,
      email,
      khoa_hoc,
      lop,
      so_dien_thoai,
      ngay_sinh,
      khoa,
      nganh_hoc,
      tai_khoan,
      mat_khau
    } = req.body || {};
    if (!mssv || !ho_ten) {
      return res.status(400).json({ ok: false, message: "mssv va ho_ten la bat buoc" });
    }
    await pool.query(
      `INSERT INTO sinh_vien
       (mssv, ho_ten, email, khoa_hoc, lop, so_dien_thoai, ngay_sinh, khoa, nganh_hoc, tai_khoan, mat_khau)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        mssv,
        ho_ten || "",
        email || "",
        khoa_hoc || "",
        lop || "",
        so_dien_thoai || "",
        ngay_sinh || null,
        khoa || "",
        nganh_hoc || "",
        tai_khoan || "",
        mat_khau || ""
      ]
    );
    await syncStudentUser({ username: tai_khoan || mssv, password: mat_khau, mssv });
    res.json({ ok: true, mssv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// PUT /api/sinh-vien/:mssv
// Body: { ho_ten?, email?, khoa_hoc? }
router.put("/:mssv", auth(["admin"]), async (req, res) => {
  const { mssv } = req.params;
  const {
    new_mssv,
    ho_ten,
    email,
    khoa_hoc,
    lop,
    so_dien_thoai,
    ngay_sinh,
    khoa,
    nganh_hoc,
    tai_khoan,
    mat_khau
  } = req.body || {};
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    let target = mssv;
    if (new_mssv && new_mssv !== mssv) {
      const [[dup]] = await conn.query("SELECT mssv FROM sinh_vien WHERE mssv=?", [new_mssv]);
      if (dup) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: "MSSV moi da ton tai" });
      }

      const tables = ["dang_ky_lop", "diem_danh", "lich_su_diem_danh", "anh_khuon_mat"];
      for (const tbl of tables) {
        await conn.query(`UPDATE ${tbl} SET mssv=? WHERE mssv=?`, [new_mssv, mssv]);
      }
      const [ret] = await conn.query("UPDATE sinh_vien SET mssv=? WHERE mssv=?", [new_mssv, mssv]);
      if (ret.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: "Khong tim thay sinh vien" });
      }
      target = new_mssv;
    }

    const [retInfo] = await conn.query(
      `UPDATE sinh_vien
       SET ho_ten = COALESCE(?, ho_ten),
           email  = COALESCE(?, email),
           khoa_hoc = COALESCE(?, khoa_hoc),
           lop = COALESCE(?, lop),
           so_dien_thoai = COALESCE(?, so_dien_thoai),
           ngay_sinh = COALESCE(?, ngay_sinh),
           khoa = COALESCE(?, khoa),
           nganh_hoc = COALESCE(?, nganh_hoc),
           tai_khoan = COALESCE(?, tai_khoan),
           mat_khau = COALESCE(?, mat_khau)
       WHERE mssv = ?`,
      [
        ho_ten ?? null,
        email ?? null,
        khoa_hoc ?? null,
        lop ?? null,
        so_dien_thoai ?? null,
        ngay_sinh ?? null,
        khoa ?? null,
        nganh_hoc ?? null,
        tai_khoan ?? null,
        mat_khau ?? null,
        target
      ]
    );

    if (retInfo.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Khong tim thay sinh vien" });
    }

    await conn.commit();
    await syncStudentUser({ username: tai_khoan || target, password: mat_khau, mssv: target });
    res.json({ ok: true, mssv: target });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  } finally {
    conn.release();
  }
});

// DELETE /api/sinh-vien/:mssv
router.delete("/:mssv", auth(["admin"]), async (req, res) => {
  try {
    const { mssv } = req.params;
    const [ret] = await pool.query("DELETE FROM sinh_vien WHERE mssv = ?", [mssv]);
    if (ret.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Khong tim thay sinh vien" });
    }
    res.json({ ok: true, mssv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: String(e) });
  }
});

export default router;
