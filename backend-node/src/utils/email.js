import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
});

export async function sendMail({ to, subject, html }) {
  if (!env.SMTP_HOST) {
    console.log("[DEV EMAIL] ->", { to, subject, html });
    return;
  }
  const fromAddr = env.SMTP_FROM || (env.SMTP_USER ? `no-reply <${env.SMTP_USER}>` : "no-reply <no-reply@example.com>");
  const replyTo = "no-reply <no-reply@example.com>";
  await transporter.sendMail({
    from: fromAddr,
    replyTo,
    to,
    subject,
    html
  });
}
