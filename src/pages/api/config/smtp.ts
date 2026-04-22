import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { config } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { getSmtpConfig, testSmtpConnection, encryptValue } from '../../../lib/email';
import { audit } from '../../../lib/audit';
import { getClientIp } from '../../../lib/middleware';

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_enabled'] as const;

export const GET: APIRoute = async ({ locals }) => {
  if (locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const smtp = getSmtpConfig();

  return new Response(JSON.stringify({
    host: smtp.host,
    port: smtp.port,
    user: smtp.user,
    pass: smtp.pass ? '••••••••' : '',
    from: smtp.from,
    enabled: smtp.enabled,
    hasPassword: !!smtp.pass,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();

  const updates: Record<string, string> = {};
  if (body.host !== undefined) updates.smtp_host = String(body.host);
  if (body.port !== undefined) updates.smtp_port = String(body.port);
  if (body.user !== undefined) updates.smtp_user = String(body.user);
  if (body.pass !== undefined && body.pass !== '••••••••') updates.smtp_pass = encryptValue(String(body.pass));
  if (body.from !== undefined) updates.smtp_from = String(body.from);
  if (body.enabled !== undefined) updates.smtp_enabled = body.enabled ? '1' : '0';

  for (const [key, value] of Object.entries(updates)) {
    db.insert(config).values({ key, value })
      .onConflictDoUpdate({ target: config.key, set: { value } })
      .run();
  }

  const ip = getClientIp(request);
  audit({
    userId: locals.user.userId,
    username: locals.user.username,
    action: 'smtp_config_updated',
    target: 'config',
    detail: `Campos actualizados: ${Object.keys(updates).join(', ')}`,
    ip,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ locals }) => {
  if (locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const result = await testSmtpConnection();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
