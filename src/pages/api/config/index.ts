import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { config, notas } from '../../../lib/schema';
import { eq, count } from 'drizzle-orm';
import { resolve } from 'path';

export const GET: APIRoute = async () => {
  const allConfig = db.select().from(config).all();
  const totalNotas = db.select({ count: count() }).from(notas).get()?.count ?? 0;
  const dbPath = resolve(process.env.DATABASE_URL || './data/petroalianza.db');

  return new Response(JSON.stringify({
    config: Object.fromEntries(allConfig.map(c => [c.key, c.value])),
    stats: { totalNotas, dbPath, version: '1.0.0' },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();

  if (body.company_name !== undefined) {
    db.update(config).set({ value: body.company_name }).where(eq(config.key, 'company_name')).run();
  }

  if (body.nota_prefix !== undefined) {
    db.insert(config).values({ key: 'nota_prefix', value: body.nota_prefix })
      .onConflictDoUpdate({ target: config.key, set: { value: body.nota_prefix } }).run();
  }

  if (body.nota_counter !== undefined) {
    const newCounter = parseInt(body.nota_counter, 10);
    if (isNaN(newCounter) || newCounter < 1) {
      return new Response(JSON.stringify({ error: 'El contador debe ser un número positivo' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check collision
    const existing = db.select().from(notas).where(eq(notas.numero, newCounter)).get();
    if (existing) {
      return new Response(JSON.stringify({ error: `Ya existe una nota con el número ${newCounter}` }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }

    db.update(config).set({ value: String(newCounter) }).where(eq(config.key, 'nota_counter')).run();
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
