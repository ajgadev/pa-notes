import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { notas } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../../lib/logger';
import { audit } from '../../../../lib/audit';
import { expireTokensForNota } from '../../../../lib/signatures';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Solo admin puede cambiar estado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = parseInt(params.id!);
  const body = await request.json();
  const estado = body.estado;

  if (estado !== 'Vigente' && estado !== 'Nula') {
    return new Response(JSON.stringify({ error: 'Estado inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = db.select().from(notas).where(eq(notas.id, id)).get();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Nota no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  db.update(notas).set({ estado }).where(eq(notas.id, id)).run();

  if (estado === 'Nula') {
    expireTokensForNota(id);
  }

  const action = estado === 'Nula' ? 'nota_anulada' : 'nota_restaurada';
  logger.info(`Nota ${estado === 'Nula' ? 'anulada' : 'restaurada'}`, { notaId: id, numero: existing.numero, user: locals.user.username });
  audit({ userId: locals.user.userId, username: locals.user.username, action, target: `nota#${existing.numero}` });

  return new Response(JSON.stringify({ success: true, estado }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
