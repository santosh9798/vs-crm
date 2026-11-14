import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { readSmtpPassword } from "@/lib/bootstrap";

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

export async function loadSmtpConfig(): Promise<SmtpConfig> {
  const setting = await prisma.setting.findUnique({ where: { key: "app" } });
  const value = (setting?.value && typeof setting.value === "object" ? setting.value : {}) as {
    smtp?: {
      host?: string;
      port?: string;
      username?: string;
      fromName?: string;
      fromEmail?: string;
    };
    companyName?: string;
  };
  const smtp = value.smtp ?? {};
  return {
    host: smtp.host?.trim() ?? "",
    port: Number(smtp.port) || 587,
    username: smtp.username?.trim() ?? "",
    password: readSmtpPassword(setting?.value),
    fromName: smtp.fromName?.trim() || value.companyName || "VOspaces",
    fromEmail: smtp.fromEmail?.trim() ?? "",
  };
}

export function assertSmtpReady(smtp: SmtpConfig) {
  if (!smtp.host || !smtp.fromEmail) {
    throw new Error("SMTP is not configured. Save host and from email in Settings first.");
  }
  if (!smtp.username || !smtp.password) {
    throw new Error("SMTP username or password is missing. Save them in Settings.");
  }
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  const smtp = await loadSmtpConfig();
  assertSmtpReady(smtp);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.username, pass: smtp.password },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
  const info = await transporter.sendMail({
    from: `${smtp.fromName} <${smtp.fromEmail}>`,
    to: input.to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { messageId: info.messageId ?? "sent" };
}
