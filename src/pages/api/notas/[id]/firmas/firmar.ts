import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { notas, profiles } from '../../../../../lib/schema';
import { eq } from 'drizzle-orm';
import { recordSignature, getSignerRoles, getRoleLabel, type SignatureRole } from '../../../../../lib/signatures';
import { audit } from '../../../../../lib/audit';
import { logger } from '../../../../../lib/logger';
import { getClientIp, getPublicBaseUrl } from '../../../../../lib/middleware';

export const POST: APIRoute = async ({ params, request, locals, url }) => {
  const user = locals.user;
  const id = parseInt(params.id!);
  const body = await request.json();
  const { role, signatureData } = body;

  if (!role || !signatureData) {
    return new Response(JSON.stringify({ error: 'Rol y firma son requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nota = db.select().from(notas).where(eq(notas.id, id)).get();
  if (!nota) {
    return new Response(JSON.stringify({ error: 'Nota no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify user's CI matches the signer for this role
  const profile = db.select().from(profiles).where(eq(profiles.userId, user.userId)).get();
  const userCi = profile?.ci?.trim() || '';

  const signers = getSignerRoles(nota);
  const signer = signers.find((s) => s.role === role);

  if (!signer) {
    return new Response(JSON.stringify({ error: 'Este rol no requiere firma en esta nota' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (userCi !== signer.ci) {
    return new Response(JSON.stringify({ error: 'Su CI no coincide con el firmante asignado para este rol' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = getClientIp(request);

  const userName = [profile?.nombre, profile?.apellido].filter(Boolean).join(' ') || user.username;

  const result = recordSignature({
    notaId: id,
    role: role as SignatureRole,
    signedByName: userName,
    signedByCi: userCi,
    signatureData,
    ip,
    baseUrl: getPublicBaseUrl(request, url),
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  logger.info('Signature recorded via auth', {
    notaId: id,
    numero: nota.numero,
    role,
    user: user.username,
  });

  audit({
    userId: user.userId,
    username: user.username,
    action: 'nota_firmada',
    target: `nota#${nota.numero}`,
    detail: `Rol: ${getRoleLabel(role as SignatureRole)} (autenticado)`,
    ip,
  });

  return new Response(JSON.stringify({
    success: true,
    allSigned: result.allSigned,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
