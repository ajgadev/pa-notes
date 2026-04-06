import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { vehicles } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const all = url.searchParams.get('all') === '1';
  const base = all
    ? db.select().from(vehicles).all()
    : db.select().from(vehicles).where(eq(vehicles.active, true)).all();

  if (q) {
    const lower = q.toLowerCase();
    return new Response(JSON.stringify(
      base.filter((v) => v.placa.toLowerCase().includes(lower) || v.marca.toLowerCase().includes(lower))
    ), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(base), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { placa, marca, modelo } = body;
    if (!placa?.trim() || !marca?.trim() || !modelo?.trim()) {
      return new Response(JSON.stringify({ error: 'Placa, marca y modelo requeridos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      db.insert(vehicles).values({ placa: placa.trim(), marca: marca.trim(), modelo: modelo.trim() }).run();
    } catch {
      return new Response(JSON.stringify({ error: 'Ya existe un vehículo con esa placa' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'update') {
    const { id, placa, marca, modelo } = body;
    const updates: Record<string, string> = {};
    if (placa !== undefined) updates.placa = placa;
    if (marca !== undefined) updates.marca = marca;
    if (modelo !== undefined) updates.modelo = modelo;
    if (Object.keys(updates).length > 0) {
      db.update(vehicles).set(updates).where(eq(vehicles.id, id)).run();
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'toggle') {
    const { id, active } = body;
    db.update(vehicles).set({ active }).where(eq(vehicles.id, id)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Acción no válida' }), {
    status: 400, headers: { 'Content-Type': 'application/json' },
  });
};
