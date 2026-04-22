import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { notas, notaItems } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { validateToken, recordSignature, getRoleLabel } from '../../../lib/signatures';
import { audit } from '../../../lib/audit';
import { logger } from '../../../lib/logger';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/middleware';

export const GET: APIRoute = async ({ params, request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`firmar:${ip}`);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: `Demasiados intentos. Intente de nuevo en ${rl.retryAfterSec}s` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSec) },
    });
  }

  const result = validateToken(params.token!);
  if (!result) {
    return new Response(JSON.stringify({ error: 'Enlace inválido, expirado o ya utilizado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { token, nota } = result;
  const items = db.select().from(notaItems).where(eq(notaItems.notaId, nota.id)).all();

  return new Response(JSON.stringify({
    nota: { ...nota, items },
    signer: {
      role: token.role,
      roleLabel: getRoleLabel(token.role as any),
      name: token.recipientName,
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ params, request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`firmar:${ip}`);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: `Demasiados intentos. Intente de nuevo en ${rl.retryAfterSec}s` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSec) },
    });
  }

  const tokenStr = params.token!;
  const result = validateToken(tokenStr);
  if (!result) {
    return new Response(JSON.stringify({ error: 'Enlace inválido, expirado o ya utilizado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { token, nota } = result;
  const body = await request.json();
  const signatureData = body.signatureData;

  if (!signatureData || typeof signatureData !== 'string') {
    return new Response(JSON.stringify({ error: 'Firma requerida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signIp = ip === 'unknown' ? '' : ip;

  const signResult = recordSignature({
    notaId: nota.id,
    role: token.role as any,
    signedByName: token.recipientName,
    signedByCi: token.recipientCi || '',
    signatureData,
    ip: signIp,
    tokenId: token.id,
  });

  if (!signResult.success) {
    return new Response(JSON.stringify({ error: signResult.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  logger.info('Signature recorded via token', {
    notaId: nota.id,
    numero: nota.numero,
    role: token.role,
    signer: token.recipientName,
  });

  audit({
    username: token.recipientName,
    action: 'nota_firmada',
    target: `nota#${nota.numero}`,
    detail: `Rol: ${getRoleLabel(token.role as any)} (via token)`,
    ip: signIp,
  });

  return new Response(JSON.stringify({
    success: true,
    allSigned: signResult.allSigned,
    message: signResult.allSigned
      ? 'Firma registrada. Todas las firmas han sido completadas.'
      : 'Firma registrada exitosamente.',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
