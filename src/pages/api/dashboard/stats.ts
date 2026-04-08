import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { notas, notaItems } from '../../../lib/schema';
import { and, gte, lte, count } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';

  // Build date filter conditions
  const conditions = [];
  if (from) conditions.push(gte(notas.fecha, from));
  if (to) conditions.push(lte(notas.fecha, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // All notas in range
  const allNotas = where
    ? db.select().from(notas).where(where).all()
    : db.select().from(notas).all();

  // Get item counts per nota
  const notaIds = allNotas.map(n => n.id);
  const itemCounts: Record<number, number> = {};
  if (notaIds.length > 0) {
    // Batch query all items for these notas
    const allItems = db.select({
      notaId: notaItems.notaId,
      totalItems: count(),
    }).from(notaItems)
      .groupBy(notaItems.notaId)
      .all();

    for (const row of allItems) {
      itemCounts[row.notaId] = row.totalItems;
    }
  }

  // Group by pozo
  const pozoMap: Record<string, { total: number; vigentes: number; nulas: number; items: number }> = {};
  for (const n of allNotas) {
    const pozo = n.pozo || 'Sin Pozo';
    if (!pozoMap[pozo]) pozoMap[pozo] = { total: 0, vigentes: 0, nulas: 0, items: 0 };
    pozoMap[pozo].total++;
    if (n.estado === 'Vigente') pozoMap[pozo].vigentes++;
    else pozoMap[pozo].nulas++;
    pozoMap[pozo].items += itemCounts[n.id] || 0;
  }

  const byPozo = Object.entries(pozoMap)
    .map(([pozo, stats]) => ({ pozo, ...stats }))
    .sort((a, b) => b.total - a.total);

  // Group by date (day)
  const dateMap: Record<string, number> = {};
  for (const n of allNotas) {
    const day = n.fecha?.slice(0, 10) || n.createdAt?.slice(0, 10) || 'unknown';
    if (day === 'unknown') continue;
    dateMap[day] = (dateMap[day] || 0) + 1;
  }

  const byDate = Object.entries(dateMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Totals
  const totalNotas = allNotas.length;
  const totalVigentes = allNotas.filter(n => n.estado === 'Vigente').length;
  const totalNulas = allNotas.filter(n => n.estado === 'Nula').length;
  const totalItems = Object.values(itemCounts)
    .filter((_, i) => notaIds.includes(allNotas[i]?.id))
    .reduce((s, c) => s + c, 0);

  return new Response(JSON.stringify({
    totals: { notas: totalNotas, vigentes: totalVigentes, nulas: totalNulas },
    byPozo,
    byDate,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
