const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req,res)=>res.json({ok:true, ts: Date.now()}));

/** --------- SINH VIEN ---------- **/

// List
app.get('/api/sinh-vien', async (req,res)=>{
  try{
    const page = Math.max(parseInt(req.query.page||'1'),1);
    const limit = Math.max(parseInt(req.query.limit||'50'),1);
    const offset = (page-1)*limit;

    const [rows] = await pool.execute(
      'SELECT mssv, ho_ten, email, khoa_hoc FROM sinh_vien ORDER BY tao_luc DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [tot] = await pool.execute('SELECT COUNT(*) AS c FROM sinh_vien');
    res.json({items: rows, page, limit, total: tot[0].c});
  }catch(e){ res.status(500).json({ok:false, message: String(e.message||e)})}
});

// T?o m?i + enroll + train (b?n �? c�; �? nguy�n n?u tr�?c �� ch?y ok)
app.post('/api/sinh-vien', async (req,res)=>{
  try{
    const { mssv, ho_ten, email, khoa_hoc } = req.body||{};
    if(!mssv) return res.status(400).json({ok:false,message:'Thi?u mssv'});
    await pool.execute(
      'INSERT INTO sinh_vien (mssv, ho_ten, email, khoa_hoc, trang_thai, tao_luc, cap_nhat_luc) VALUES (?,?,?,?, "Dang hoc", NOW(), NOW()) ON DUPLICATE KEY UPDATE ho_ten=VALUES(ho_ten), email=VALUES(email), khoa_hoc=VALUES(khoa_hoc), cap_nhat_luc=NOW()',
      [mssv, ho_ten||'', email||'', khoa_hoc||'']
    );
    res.json({ok:true});
  }catch(e){ res.status(500).json({ok:false, message:String(e.message||e)}); }
});

// C?p nh?t (S?A)
app.put('/api/sinh-vien/:mssv', async (req,res)=>{
  try{
    const mssv = req.params.mssv;
    const { ho_ten='', email='', khoa_hoc='' } = req.body||{};
    const [r] = await pool.execute(
      'UPDATE sinh_vien SET ho_ten=?, email=?, khoa_hoc=?, cap_nhat_luc=NOW() WHERE mssv=?',
      [ho_ten, email, khoa_hoc, mssv]
    );
    if(r.affectedRows===0) return res.status(404).json({ok:false,message:'Kh�ng t?m th?y MSSV'});
    res.json({ok:true});
  }catch(e){ res.status(500).json({ok:false, message:String(e.message||e)}); }
});

// X�a
app.delete('/api/sinh-vien/:mssv', async (req,res)=>{
  try{
    const mssv = req.params.mssv;
    const [r] = await pool.execute('DELETE FROM sinh_vien WHERE mssv=?',[mssv]);
    if(r.affectedRows===0) return res.status(404).json({ok:false,message:'Kh�ng t?m th?y MSSV'});
    res.json({ok:true});
  }catch(e){ res.status(500).json({ok:false, message:String(e.message||e)}); }
});

/** --------- L?CH S? ---------- **/
// Giữ endpoint cũ /api/lich-su cho tương thích
app.get('/api/lich-su', async (req,res)=>{
  try{
    const page = Math.max(parseInt(req.query.page||'1'),1);
    const limit = Math.max(parseInt(req.query.limit||'20'),1);
    const offset = (page-1)*limit;
    const [rows] = await pool.execute(
      'SELECT ma_lich_su AS id, mssv, ho_ten, thoi_gian_diem_danh AS thoi_gian, trang_thai_diem_danh AS trang_thai, ma_thiet_bi AS thiet_bi FROM lich_su_diem_danh ORDER BY thoi_gian_diem_danh DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [tot] = await pool.execute('SELECT COUNT(*) AS c FROM lich_su_diem_danh');
    res.json({items: rows, page, limit, total: tot[0].c});
  }catch(e){ res.status(500).json({ok:false, message:String(e.message||e)}); }
});

// Endpoint mới dùng cho frontend: /api/diem-danh/logs
app.get('/api/diem-danh/logs', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1'), 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50')));
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT 
         lsd.ma_lich_su      AS ma_lich_su,
         lsd.mssv            AS mssv,
         lsd.ho_ten          AS ho_ten,
         lsd.ma_lop          AS ma_lop,
         lsd.trang_thai_diem_danh AS trang_thai_diem_danh,
         lsd.thoi_gian_diem_danh  AS thoi_gian_diem_danh,
         lsd.ma_thiet_bi     AS ma_thiet_bi,
         lsd.do_tin_cay      AS do_tin_cay
       FROM lich_su_diem_danh lsd
       ORDER BY lsd.thoi_gian_diem_danh DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [tot] = await pool.execute('SELECT COUNT(*) AS c FROM lich_su_diem_danh');
    res.json({ ok: true, data: rows, page, limit, total: tot[0].c });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

// Xóa log điểm danh theo id/ma_lich_su
app.delete('/api/diem-danh/logs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [r] = await pool.execute(
      'DELETE FROM lich_su_diem_danh WHERE ma_lich_su=? OR id=? LIMIT 1',
      [id, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Khong tim thay lich su' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

/** --------- LOP HOC (CRUD don gian) ---------- **/
app.get('/api/lop-hoc', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1'), 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50')));
    const offset = (page - 1) * limit;
    const kw = (req.query.keyword || '').trim();
    const where = kw ? "WHERE lh.ma_lop LIKE ? OR lh.ten_mon_hoc LIKE ? OR gv.ho_ten LIKE ?" : "";
    const args = kw ? [`%${kw}%`, `%${kw}%`, `%${kw}%`, limit, offset] : [limit, offset];
    const [rows] = await pool.execute(
      `SELECT lh.ma_lop, lh.ten_mon_hoc, lh.phong_hoc, lh.thoi_gian_bat_dau, lh.thoi_gian_ket_thuc, lh.ma_giang_vien,
              gv.ho_ten AS ten_giang_vien
         FROM lop_hoc lh
         LEFT JOIN giang_vien gv ON gv.ma_giang_vien = lh.ma_giang_vien
         ${where}
         ORDER BY lh.ma_lop DESC
         LIMIT ? OFFSET ?`,
      args
    );
    const [tot] = await pool.execute(
      `SELECT COUNT(*) AS c FROM lop_hoc ${kw ? "WHERE ma_lop LIKE ? OR ten_mon_hoc LIKE ?" : ""}`,
      kw ? [`%${kw}%`, `%${kw}%`] : []
    );
    res.json({ ok: true, data: rows, page, limit, total: tot[0].c });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

app.post('/api/lop-hoc', async (req, res) => {
  try {
    const { ma_lop, ten_mon_hoc, phong_hoc, thoi_gian_bat_dau = null, thoi_gian_ket_thuc = null } = req.body || {};
    if (!ma_lop || !ten_mon_hoc) return res.status(400).json({ ok: false, message: "Thieu ma_lop hoac ten_mon_hoc" });
    await pool.execute(
      "INSERT INTO lop_hoc (ma_lop, ten_mon_hoc, phong_hoc, thoi_gian_bat_dau, thoi_gian_ket_thuc) VALUES (?,?,?,?,?)",
      [ma_lop, ten_mon_hoc, phong_hoc || null, thoi_gian_bat_dau, thoi_gian_ket_thuc]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

app.put('/api/lop-hoc/:ma_lop', async (req, res) => {
  const current = req.params.ma_lop;
  const { new_ma_lop, ten_mon_hoc, phong_hoc, thoi_gian_bat_dau = null, thoi_gian_ket_thuc = null } = req.body || {};
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let target = current;
    if (new_ma_lop && new_ma_lop !== current) {
      const [dup] = await conn.execute("SELECT ma_lop FROM lop_hoc WHERE ma_lop=?", [new_ma_lop]);
      if (dup[0]) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: "Ma lop moi da ton tai" });
      }
      const tables = ["dang_ky_lop", "diem_danh", "lich_su_diem_danh"];
      for (const tbl of tables) {
        await conn.execute(`UPDATE ${tbl} SET ma_lop=? WHERE ma_lop=?`, [new_ma_lop, current]);
      }
      await conn.execute("UPDATE lop_hoc SET ma_lop=? WHERE ma_lop=?", [new_ma_lop, current]);
      target = new_ma_lop;
    }
    await conn.execute(
      "UPDATE lop_hoc SET ten_mon_hoc=COALESCE(?, ten_mon_hoc), phong_hoc=COALESCE(?, phong_hoc), thoi_gian_bat_dau=?, thoi_gian_ket_thuc=? WHERE ma_lop=?",
      [ten_mon_hoc ?? null, phong_hoc ?? null, thoi_gian_bat_dau, thoi_gian_ket_thuc, target]
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  } finally {
    conn.release();
  }
});

app.delete('/api/lop-hoc/:ma_lop', async (req, res) => {
  const ma_lop = req.params.ma_lop;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // xoa cascade de tranh loi FK
    await conn.execute("DELETE FROM dang_ky_lop WHERE ma_lop=?", [ma_lop]);
    await conn.execute("DELETE FROM diem_danh WHERE ma_lop=?", [ma_lop]);
    await conn.execute("DELETE FROM lich_su_diem_danh WHERE ma_lop=?", [ma_lop]);
    const [r] = await conn.execute("DELETE FROM lop_hoc WHERE ma_lop=?", [ma_lop]);
    await conn.commit();
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "Khong tim thay lop" });
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  } finally {
    conn.release();
  }
});

/** --------- GIANG VIEN ---------- **/
app.get('/api/giang-vien', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1'), 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50')));
    const offset = (page - 1) * limit;
    const kw = (req.query.keyword || '').trim();
    const where = kw ? "WHERE ma_giang_vien LIKE ? OR ho_ten LIKE ? OR email LIKE ?" : "";
    const args = kw ? [`%${kw}%`, `%${kw}%`, `%${kw}%`, limit, offset] : [limit, offset];
    const [rows] = await pool.execute(
      `SELECT ma_giang_vien, ho_ten, email, so_dien_thoai
         FROM giang_vien
         ${where}
         ORDER BY ma_giang_vien ASC
         LIMIT ? OFFSET ?`,
      args
    );
    const [tot] = await pool.execute(
      `SELECT COUNT(*) AS c FROM giang_vien ${kw ? "WHERE ma_giang_vien LIKE ? OR ho_ten LIKE ? OR email LIKE ?" : ""}`,
      kw ? [`%${kw}%`, `%${kw}%`, `%${kw}%`] : []
    );
    res.json({ ok: true, data: rows, page, limit, total: tot[0].c });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

app.post('/api/giang-vien', async (req, res) => {
  try {
    const { ma_giang_vien, ho_ten, email = null, so_dien_thoai = null, mat_khau = null, tai_khoan = null } = req.body || {};
    if (!ma_giang_vien || !ho_ten) return res.status(400).json({ ok: false, message: "Thieu ma_giang_vien hoac ho_ten" });
    await pool.execute(
      "INSERT INTO giang_vien (ma_giang_vien, ho_ten, email, so_dien_thoai, mat_khau, tai_khoan) VALUES (?,?,?,?,?,?)",
      [ma_giang_vien, ho_ten, email, so_dien_thoai, mat_khau || "", tai_khoan]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

app.put('/api/giang-vien/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ho_ten, email = null, so_dien_thoai = null, mat_khau, tai_khoan = null } = req.body || {};
    const sets = [];
    const params = [];
    if (ho_ten !== undefined) { sets.push("ho_ten=?"); params.push(ho_ten); }
    if (email !== undefined) { sets.push("email=?"); params.push(email); }
    if (so_dien_thoai !== undefined) { sets.push("so_dien_thoai=?"); params.push(so_dien_thoai); }
    if (mat_khau !== undefined) { sets.push("mat_khau=?"); params.push(mat_khau); }
    if (tai_khoan !== undefined) { sets.push("tai_khoan=?"); params.push(tai_khoan); }
    if (!sets.length) return res.json({ ok: true, message: "No changes" });
    params.push(id);
    const [r] = await pool.execute(`UPDATE giang_vien SET ${sets.join(", ")} WHERE ma_giang_vien=?`, params);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "Khong tim thay giang vien" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

app.delete('/api/giang-vien/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [r] = await pool.execute("DELETE FROM giang_vien WHERE ma_giang_vien=?", [id]);
    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "Khong tim thay giang vien" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log(`Backend listening on ${PORT}`));

// ====== HOT PATCH: SV update & delete (PUT/DELETE) ======
const _poolSV = require('./db'); // d�ng t�n kh�c �? kh�ng �� bi?n pool c?

// C?p nh?t sinh vi�n
app.put('/api/sinh-vien/:mssv', async (req, res) => {
  try {
    const mssv = req.params.mssv;
    const { ho_ten = '', email = '', khoa_hoc = '' } = req.body || {};
    const [r] = await _poolSV.execute(
      'UPDATE sinh_vien SET ho_ten=?, email=?, khoa_hoc=?, cap_nhat_luc=NOW() WHERE mssv=?',
      [ho_ten, email, khoa_hoc, mssv]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: 'Kh�ng t?m th?y MSSV' });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});

// X�a sinh vi�n (x�a c?ng; n?u mu?n soft-delete th? �?i th�nh UPDATE tr?ng_thai)
app.delete('/api/sinh-vien/:mssv', async (req, res) => {
  try {
    const mssv = req.params.mssv;
    const [r] = await _poolSV.execute('DELETE FROM sinh_vien WHERE mssv=?', [mssv]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: 'Kh�ng t?m th?y MSSV' });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
});
// ====== END HOT PATCH ======
