const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'thith',
  password: process.env.MYSQL_PASSWORD || '15112004',
  database: process.env.MYSQL_DB || 'diem_danh',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_general_ci',
});

module.exports = pool;
