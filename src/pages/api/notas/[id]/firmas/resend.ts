import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { notas, signatureTokens, personal, profiles, users } from '../../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { getSignerRoles, getSignaturesForNota, getRoleLabel, type SignatureRole } from '../../../../../lib/signatures';
import { queueEmail } from '../../../../../lib/email';
import { signatureRequestTemplate } from '../../../../../lib/email-templates';
import { audit } from '../../../../../lib/audit';
import { logger } from '../../../../../lib/logger';
import { getClientIp, getPublicBaseUrl } from '../../../../../lib/middleware';

export const POST: APIRoute = async ({ params, request, locals, url }) => {
  const user = locals.user;
  if (user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Solo administradores pueden reenviar correos' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = parseInt(params.id!);
  const nota = db.select().from(notas).where(eq(notas.id, id)).get();
  if (!nota) {
    return new Response(JSON.stringify({ error: 'Nota no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (nota.estado === 'Nula') {
    return new Response(JSON.stringify({ error: 'No se puede reenviar correos de una nota anulada' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const targetRole: string | null = body.role ?? null; // null = all pending

  const sigs = getSignaturesForNota(id);
  const signers = getSignerRoles(nota);
  const baseUrl = getPublicBaseUrl(request, url);
  const ip = getClientIp(request);

  const pendingSigners = signers.filter((s) => {
    if (sigs.find((sg) => sg.role === s.role)) return false;
    if (targetRole && s.role !== targetRole) return false;
    return true;
  });

  if (pendingSigners.length === 0) {
    return new Response(JSON.stringify({ error: targetRole ? 'Este rol ya fue firmado' : 'No hay firmas pendientes' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  const warnings: string[] = [];

  for (const signer of pendingSigners) {
    // Find existing valid token
    const token = db.select().from(signatureTokens)
      .where(and(
        eq(signatureTokens.notaId, id),
        eq(signatureTokens.role, signer.role),
      ))
      .all()
      .find((t) => !t.usedAt && new Date(t.expiresAt) > new Date());

    if (!token) {
      warnings.push(`No hay token válido para ${getRoleLabel(signer.role as SignatureRole)}`);
      continue;
    }

    // Find email
    const person = db.select().from(personal).where(eq(personal.ci, signer.ci)).get();
    let email = person?.email?.trim() || '';
    if (!email) {
      const profile = db.select({ userId: profiles.userId }).from(profiles)
        .where(eq(profiles.ci, signer.ci)).get();
      if (profile) {
        const u = db.select({ email: users.email }).from(users)
          .where(eq(users.id, profile.userId)).get();
        email = u?.email?.trim() || '';
      }
    }

    if (!email) {
      warnings.push(`No se encontró email para ${getRoleLabel(signer.role as SignatureRole)} (${signer.name})`);
      continue;
    }

    const tmpl = signatureRequestTemplate({
      numero: nota.numero,
      role: getRoleLabel(signer.role as SignatureRole),
      signerName: signer.name,
      url: `${baseUrl}/firmar/${token.token}`,
      baseUrl,
    });
    queueEmail(email, tmpl.subject, tmpl.html);
    sent++;
  }

  logger.info('Signature emails resent', {
    notaId: id,
    numero: nota.numero,
    role: targetRole || 'all_pending',
    sent,
    by: user.username,
  });

  audit({
    userId: user.userId,
    username: user.username,
    action: 'firma_email_reenviado',
    target: `nota#${nota.numero}`,
    detail: targetRole ? `Rol: ${getRoleLabel(targetRole as SignatureRole)}` : `Todos pendientes (${sent} enviados)`,
    ip,
  });

  return new Response(JSON.stringify({
    success: true,
    sent,
    warnings,
    message: sent > 0
      ? `${sent} correo${sent > 1 ? 's' : ''} reenviado${sent > 1 ? 's' : ''}`
      : 'No se pudo enviar ningún correo',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
