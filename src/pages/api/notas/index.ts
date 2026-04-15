import type { APIRoute } from 'astro';
import { db, sqlite } from '../../../lib/db';
import { notas, notaItems, config } from '../../../lib/schema';
import { desc } from 'drizzle-orm';
import { logger } from '../../../lib/logger';
import { audit } from '../../../lib/audit';

export const GET: APIRoute = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('q') || '';
  const offset = (page - 1) * limit;

  let query = db.select().from(notas).orderBy(desc(notas.numero));

  const allRows = search
    ? query.all().filter((n) =>
        String(n.numero).includes(search) ||
        n.departamento?.toLowerCase().includes(search.toLowerCase()) ||
        n.solicitante.toLowerCase().includes(search.toLowerCase()) ||
        n.destino.toLowerCase().includes(search.toLowerCase()) ||
        n.pozo?.toLowerCase().includes(search.toLowerCase())
      )
    : query.all();

  const total = allRows.length;
  const rows = allRows.slice(offset, offset + limit);

  return new Response(JSON.stringify({ data: rows, total, page, limit }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  const body = await request.json();

  if (!body.tipoSalida || !body.solicitante || !body.destino) {
    return new Response(JSON.stringify({ error: 'Tipo de salida, solicitante y destino son requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.items || body.items.length === 0 || !body.items.some((i: any) => i.descripcion?.trim())) {
    return new Response(JSON.stringify({ error: 'Debe incluir al menos un ítem con descripción' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Atomic transaction: read counter, insert nota, increment counter
    const createNota = sqlite.transaction(() => {
      const row = sqlite.prepare("SELECT value FROM config WHERE key = 'nota_counter'").get() as { value: string };
      const numero = parseInt(row.value, 10);

      sqlite.prepare("UPDATE config SET value = ? WHERE key = 'nota_counter'").run(String(numero + 1));

      const result = sqlite.prepare(`
        INSERT INTO notas (numero, departamento, fecha, empresa, base, pozo, taladro, tipo_salida, solicitante, destino,
          v_placa, v_marca, v_modelo, c_nombre, c_ci, g_nombre, g_ci, s_nombre, s_ci,
          elab_nombre, elab_ci, apro_nombre, apro_ci, creado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        numero,
        body.departamento || '',
        body.fecha || null,
        body.empresa || 'Petro Alianza',
        body.base || 'Oriente',
        body.pozo || '',
        body.taladro || '',
        body.tipoSalida,
        body.solicitante,
        body.destino,
        body.vPlaca || '',
        body.vMarca || '',
        body.vModelo || '',
        body.cNombre || '',
        body.cCi || '',
        body.gNombre || '',
        body.gCi || '',
        body.sNombre || '',
        body.sCi || '',
        body.elabNombre || '',
        body.elabCi || '',
        body.aproNombre || '',
        body.aproCi || '',
        user.userId,
      );

      const notaId = result.lastInsertRowid;

      const insertItem = sqlite.prepare(`
        INSERT INTO nota_items (nota_id, orden, no_parte, unidad, cantidad, descripcion, no_serial)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.descripcion?.trim()) continue;
        insertItem.run(notaId, i + 1, item.noParte || '', item.unidad || 1, item.cantidad || 1, item.descripcion, item.noSerial || '');
      }

      return { id: notaId, numero };
    });

    const result = createNota();
    logger.info('Nota created', { id: result.id, numero: result.numero, user: user.username });
    audit({ userId: user.userId, username: user.username, action: 'nota_created', target: `nota#${result.numero}` });
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    logger.error('Nota creation failed', { error: err.message, user: user.username });
    return new Response(JSON.stringify({ error: err.message || 'Error al crear nota' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
