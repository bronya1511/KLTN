import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "thith",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "diem_danh",
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
