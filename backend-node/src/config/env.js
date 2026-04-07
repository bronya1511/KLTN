import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 8080,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || "diem_danh",
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:5002",
  PYTHON_SERVICE_TOKEN: process.env.PYTHON_SERVICE_TOKEN || "",
  JWT_SECRET: process.env.JWT_SECRET || "secret",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || "Diem danh <no-reply@example.com>"
};
