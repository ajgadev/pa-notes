import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { notas, profiles, signatures } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

const SIGNER_FIELDS = [
  { ciCol: 'c_ci', role: 'conductor' },
  { ciCol: 'g_ci', role: 'gerente' },
  { ciCol: 's_ci', role: 'seguridad' },
  { ciCol: 'elab_ci', role: 'elaborado' },
  { ciCol: 'apro_ci', role: 'aprobado' },
] as const;

export const GET: APIRoute = async ({ locals }) => {
  const profile = db.select().from(profiles).where(eq(profiles.userId, locals.user.userId)).get();
  const userCi = profile?.ci?.trim();

  if (!userCi) {
    return new Response(JSON.stringify({ data: [], total: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const allNotas = db.select().from(notas)
    .where(eq(notas.estado, 'Vigente'))
    .all();

  const pending = allNotas.filter((nota) => {
    const matchingRoles: string[] = [];
    for (const { ciCol, role } of SIGNER_FIELDS) {
      const ci = (nota as any)[ciCol === 'c_ci' ? 'cCi' : ciCol === 'g_ci' ? 'gCi' : ciCol === 's_ci' ? 'sCi' : ciCol === 'elab_ci' ? 'elabCi' : 'aproCi'];
      if (ci?.trim() === userCi) matchingRoles.push(role);
    }
    if (matchingRoles.length === 0) return false;

    const sigs = db.select({ role: signatures.role }).from(signatures)
      .where(eq(signatures.notaId, nota.id)).all();
    const signedRoles = new Set(sigs.map((s) => s.role));

    return matchingRoles.some((r) => !signedRoles.has(r));
  });

  return new Response(JSON.stringify({ data: pending, total: pending.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
