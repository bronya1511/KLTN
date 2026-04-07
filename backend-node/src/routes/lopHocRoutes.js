import { Router } from "express";
import pool from "../db.js";

const r = Router();

/** DEBUG: ping �? ch?c ch?n router n�y ��?c mount */
r.get("/ping", (req,res)=>res.json({ ok:true, from:"lopHocRoutes.js" }));

/** GET /api/lop-hoc?page=&limit=&keyword= */
r.get("/", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "20", 10)));
    const kw    = (req.query.keyword || "").trim();
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (kw) {
      where.push("(ma_lop LIKE ? OR ten_mon_hoc LIKE ? OR phong_hoc LIKE ?)");
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // KH�NG d�ng ? trong LIMIT/OFFSET
    const sql = `
      SELECT
        ma_lop,
        ten_mon_hoc AS ten_lop,
        phong_hoc   AS ghi_chu,
        thoi_gian_bat_dau,
        thoi_gian_ket_thuc,
        ma_giang_vien
      FROM lop_hoc
      ${whereSql}
      ORDER BY ma_lop ASC
      LIMIT ${offset}, ${limit}
    `;
    const [rows] = await pool.query(sql, params);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM lop_hoc ${whereSql}`, params
    );
    res.json({ items: rows, page, limit, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:String(e) });
  }
});

/** POST /api/lop-hoc */
r.post("/", async (req,res)=>{
  try{
    const { ma_lop, ten_lop, ghi_chu, ten_mon_hoc, phong_hoc,
            thoi_gian_bat_dau=null, thoi_gian_ket_thuc=null, ma_giang_vien=null } = req.body || {};
    const _ten_mon_hoc = ten_mon_hoc ?? ten_lop;
    const _phong_hoc   = phong_hoc   ?? ghi_chu;

    if(!ma_lop || !_ten_mon_hoc){
      return res.status(400).json({ ok:false, message:"ma_lop v� ten_lop/ten_mon_hoc l� b?t bu?c" });
    }

    await pool.query(
      `INSERT INTO lop_hoc (ma_lop,ten_mon_hoc,phong_hoc,thoi_gian_bat_dau,thoi_gian_ket_thuc,ma_giang_vien)
       VALUES (?,?,?,?,?,?)`,
      [ma_lop,_ten_mon_hoc,_phong_hoc,thoi_gian_bat_dau,thoi_gian_ket_thuc,ma_giang_vien]
    );

    res.json({ ok:true, ma_lop });
  }catch(e){
    console.error(e);
    res.status(500).json({ ok:false, message:String(e) });
  }
});

/** PUT /api/lop-hoc/:ma_lop */
r.put("/:ma_lop", async (req,res)=>{
  try{
    const { ma_lop } = req.params;
    const { ten_lop, ghi_chu, ten_mon_hoc, phong_hoc,
            thoi_gian_bat_dau=null, thoi_gian_ket_thuc=null, ma_giang_vien=null } = req.body || {};
    const _ten_mon_hoc = ten_mon_hoc ?? ten_lop;
    const _phong_hoc   = phong_hoc   ?? ghi_chu;

    const [ret] = await pool.query(
      `UPDATE lop_hoc SET
         ten_mon_hoc = COALESCE(?, ten_mon_hoc),
         phong_hoc   = COALESCE(?, phong_hoc),
         thoi_gian_bat_dau = ?,
         thoi_gian_ket_thuc = ?,
         ma_giang_vien = ?
       WHERE ma_lop = ?`,
      [_ten_mon_hoc,_phong_hoc,thoi_gian_bat_dau,thoi_gian_ket_thuc,ma_giang_vien,ma_lop]
    );

    if(ret.affectedRows===0) return res.status(404).json({ ok:false, message:"Kh�ng t?m th?y l?p" });
    res.json({ ok:true, ma_lop });
  }catch(e){
    console.error(e);
    res.status(500).json({ ok:false, message:String(e) });
  }
});

/** DELETE /api/lop-hoc/:ma_lop */
r.delete("/:ma_lop", async (req,res)=>{
  try{
    const { ma_lop } = req.params;
    const [ret] = await pool.query(`DELETE FROM lop_hoc WHERE ma_lop=?`, [ma_lop]);
    if(ret.affectedRows===0) return res.status(404).json({ ok:false, message:"Kh�ng t?m th?y l?p" });
    res.json({ ok:true, ma_lop });
  }catch(e){
    console.error(e);
    res.status(500).json({ ok:false, message:String(e) });
  }
});

export default r;
