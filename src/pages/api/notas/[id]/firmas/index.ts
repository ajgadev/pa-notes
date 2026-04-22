import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { notas } from '../../../../../lib/schema';
import { eq } from 'drizzle-orm';
import {
  getSignaturesForNota,
  getTokensForNota,
  getSignerRoles,
  getRoleLabel,
  type SignatureRole,
} from '../../../../../lib/signatures';

export const GET: APIRoute = async ({ params, locals }) => {
  const id = parseInt(params.id!);
  const nota = db.select().from(notas).where(eq(notas.id, id)).get();
  if (!nota) {
    return new Response(JSON.stringify({ error: 'Nota no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sigs = getSignaturesForNota(id);
  const tokens = getTokensForNota(id);
  const signerRoles = getSignerRoles(nota);

  const rolesStatus = signerRoles.map((s) => {
    const sig = sigs.find((sg) => sg.role === s.role);
    const token = tokens.find((t) => t.role === s.role && !t.usedAt);
    return {
      role: s.role,
      roleLabel: getRoleLabel(s.role),
      signerName: s.name,
      signerCi: s.ci,
      signed: !!sig,
      signedAt: sig?.signedAt ?? null,
      signedByName: sig?.signedByName ?? null,
      ip: sig?.ip ?? null,
      tokenUrl: token ? `/firmar/${token.token}` : null,
      tokenExpired: token ? new Date(token.expiresAt) < new Date() : false,
    };
  });

  return new Response(JSON.stringify({
    signatureStatus: nota.signatureStatus,
    roles: rolesStatus,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
