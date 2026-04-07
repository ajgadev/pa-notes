import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { personal } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const all = url.searchParams.get('all') === '1';
  const base = all
    ? db.select().from(personal).all()
    : db.select().from(personal).where(eq(personal.active, true)).all();

  if (q) {
    const lower = q.toLowerCase();
    return new Response(JSON.stringify(
      base.filter((p) =>
        p.ci.toLowerCase().includes(lower) ||
        p.nombre.toLowerCase().includes(lower) ||
        p.apellido.toLowerCase().includes(lower)
      )
    ), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(base), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Solo admin puede modificar personal' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { ci, nombre, apellido, cargo, email } = body;
    if (!ci?.trim() || !nombre?.trim()) {
      return new Response(JSON.stringify({ error: 'C.I. y nombre requeridos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      db.insert(personal).values({
        ci: ci.trim(), nombre: nombre.trim(),
        apellido: apellido?.trim() || '', cargo: cargo?.trim() || '',
        email: email?.trim() || '',
      }).run();
    } catch {
      return new Response(JSON.stringify({ error: 'Ya existe una persona con esa C.I.' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'update') {
    const { id, ci, nombre, apellido, cargo, email } = body;
    const updates: Record<string, string> = {};
    if (ci !== undefined) updates.ci = ci;
    if (nombre !== undefined) updates.nombre = nombre;
    if (apellido !== undefined) updates.apellido = apellido;
    if (cargo !== undefined) updates.cargo = cargo;
    if (email !== undefined) updates.email = email;
    if (Object.keys(updates).length > 0) {
      db.update(personal).set(updates).where(eq(personal.id, id)).run();
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'toggle') {
    const { id, active } = body;
    db.update(personal).set({ active }).where(eq(personal.id, id)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Acción no válida' }), {
    status: 400, headers: { 'Content-Type': 'application/json' },
  });
};
