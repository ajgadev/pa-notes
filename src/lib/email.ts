import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from './db';
import { config, emailQueue } from './schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from './logger';

const MAX_ATTEMPTS = 3;
const ENC_PREFIX = 'enc:';

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || 'default-key-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptValue(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  const key = getEncryptionKey();
  const data = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  enabled: boolean;
}

function getConfigValue(key: string): string {
  const row = db.select().from(config).where(eq(config.key, key)).get();
  return row?.value ?? '';
}

function decryptSmtpPass(stored: string): string {
  if (!stored) return '';
  try {
    return decryptValue(stored);
  } catch {
    return stored;
  }
}

export function getSmtpConfig(): SmtpConfig {
  return {
    host: getConfigValue('smtp_host') || process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(getConfigValue('smtp_port') || process.env.SMTP_PORT || '465'),
    user: getConfigValue('smtp_user') || process.env.SMTP_USER || 'resend',
    pass: decryptSmtpPass(getConfigValue('smtp_pass')) || process.env.SMTP_PASS || '',
    from: getConfigValue('smtp_from') || process.env.SMTP_FROM || 'PetroAlianza <onboarding@resend.dev>',
    enabled: (getConfigValue('smtp_enabled') || process.env.SMTP_ENABLED || '') === '1',
  };
}

function createTransport(smtp: SmtpConfig) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const smtp = getSmtpConfig();
  if (!smtp.pass) return { ok: false, error: 'No se ha configurado la contraseña SMTP' };

  try {
    const transport = createTransport(smtp);
    await transport.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function queueEmail(to: string, subject: string, html: string) {
  db.insert(emailQueue).values({
    toAddress: to,
    subject,
    bodyHtml: html,
  }).run();
}

export async function processEmailQueue(): Promise<{ sent: number; failed: number }> {
  const smtp = getSmtpConfig();
  if (!smtp.enabled || !smtp.pass) return { sent: 0, failed: 0 };

  const pending = db.select().from(emailQueue)
    .where(and(
      eq(emailQueue.status, 'pending'),
      sql`${emailQueue.attempts} < ${MAX_ATTEMPTS}`,
    ))
    .limit(10)
    .all();

  if (pending.length === 0) return { sent: 0, failed: 0 };

  const transport = createTransport(smtp);
  let sent = 0;
  let failed = 0;

  for (const email of pending) {
    try {
      await transport.sendMail({
        from: smtp.from,
        to: email.toAddress,
        subject: email.subject,
        html: email.bodyHtml,
      });

      db.update(emailQueue)
        .set({ status: 'sent', lastAttempt: new Date().toISOString(), attempts: email.attempts + 1 })
        .where(eq(emailQueue.id, email.id))
        .run();

      sent++;
    } catch (err: any) {
      const attempts = email.attempts + 1;
      db.update(emailQueue)
        .set({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          lastAttempt: new Date().toISOString(),
          attempts,
          error: err.message,
        })
        .where(eq(emailQueue.id, email.id))
        .run();

      logger.error('Email send failed', { id: email.id, to: email.toAddress, error: err.message });
      failed++;
    }
  }

  return { sent, failed };
}
