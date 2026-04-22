import type { APIRoute } from 'astro';
import { db, sqlite } from '../../../../lib/db';
import { notas, notaItems, signatures } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';
import { hasAnySignature, createSignatureTokens } from '../../../../lib/signatures';

export const GET: APIRoute = async ({ params }) => {
  const id = parseInt(params.id!);
  const nota = db.select().from(notas).where(eq(notas.id, id)).get();
  if (!nota) {
    return new Response(JSON.stringify({ error: 'Nota no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const items = db.select().from(notaItems).where(eq(notaItems.notaId, id)).all();
  const sigs = db.select({
    role: signatures.role,
    signedByName: signatures.signedByName,
    signedAt: signatures.signedAt,
  }).from(signatures).where(eq(signatures.notaId, id)).all();

  return new Response(JSON.stringify({ ...nota, items, signatures: sigs }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseInt(params.id!);
  const body = await request.json();

  const existing = db.select().from(notas).where(eq(notas.id, id)).get();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Nota no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (hasAnySignature(id)) {
    return new Response(JSON.stringify({ error: 'No se puede editar una nota con firmas existentes. Anule la nota y cree una nueva.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const updateNota = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE notas SET
          departamento = ?, fecha = ?, empresa = ?, base = ?, pozo = ?, taladro = ?,
          tipo_salida = ?, solicitante = ?, destino = ?,
          v_placa = ?, v_marca = ?, v_modelo = ?,
          c_nombre = ?, c_ci = ?, g_nombre = ?, g_ci = ?, s_nombre = ?, s_ci = ?,
          elab_nombre = ?, elab_ci = ?, apro_nombre = ?, apro_ci = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.departamento || '', body.fecha || null, body.empresa || 'Petro Alianza',
        body.base || 'Oriente', body.pozo || '', body.taladro || '',
        body.tipoSalida, body.solicitante, body.destino,
        body.vPlaca || '', body.vMarca || '', body.vModelo || '',
        body.cNombre || '', body.cCi || '', body.gNombre || '', body.gCi || '',
        body.sNombre || '', body.sCi || '',
        body.elabNombre || '', body.elabCi || '', body.aproNombre || '', body.aproCi || '',
        id,
      );

      // Replace items
      sqlite.prepare('DELETE FROM nota_items WHERE nota_id = ?').run(id);
      const insertItem = sqlite.prepare(`
        INSERT INTO nota_items (nota_id, orden, no_parte, unidad, cantidad, descripcion, no_serial)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.descripcion?.trim()) continue;
        insertItem.run(id, i + 1, item.noParte || '', item.unidad || 1, item.cantidad || 1, item.descripcion, item.noSerial || '');
      }
    });

    updateNota();

    // Regenerate signature tokens for updated signer assignments
    createSignatureTokens(id, body);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
