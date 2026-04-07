const express = require('express');
const pool = require('../db');
const router = express.Router();

/** C?p nh?t sinh vi�n */
router.put('/sinh-vien/:mssv', async (req, res) => {
  try {
    const mssv = req.params.mssv;
    const { ho_ten = '', email = '', khoa_hoc = '' } = req.body || {};
    const [r] = await pool.execute(
      'UPDATE sinh_vien SET ho_ten=?, email=?, khoa_hoc=?, cap_nhat_luc=NOW() WHERE mssv=?',
      [ho_ten, email, khoa_hoc, mssv]
    );
    if (r.affectedRows === 0)
      return res.status(404).json({ ok: false, message: 'Kh�ng t?m th?y MSSV' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

/** X�a sinh vi�n */
router.delete('/sinh-vien/:mssv', async (req, res) => {
  try {
    const mssv = req.params.mssv;
    const [r] = await pool.execute('DELETE FROM sinh_vien WHERE mssv=?', [mssv]);
    if (r.affectedRows === 0)
      return res.status(404).json({ ok: false, message: 'Kh�ng t?m th?y MSSV' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

module.exports = router;
