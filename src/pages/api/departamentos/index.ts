import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { departments } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const all = url.searchParams.get('all') === '1';
  const base = all
    ? db.select().from(departments).all()
    : db.select().from(departments).where(eq(departments.active, true)).all();

  const rows = q
    ? base.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    : base;

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { name } = body;
    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre requerido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      db.insert(departments).values({ name: name.trim() }).run();
    } catch {
      return new Response(JSON.stringify({ error: 'Ya existe un departamento con ese nombre' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'update') {
    const { id, name } = body;
    if (name !== undefined) db.update(departments).set({ name }).where(eq(departments.id, id)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'toggle') {
    const { id, active } = body;
    db.update(departments).set({ active }).where(eq(departments.id, id)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Acción no válida' }), {
    status: 400, headers: { 'Content-Type': 'application/json' },
  });
};
