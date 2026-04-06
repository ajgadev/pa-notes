import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { profiles } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  const profile = db.select().from(profiles).where(eq(profiles.userId, user.userId)).get();

  return new Response(JSON.stringify(profile || { nombre: '', apellido: '', ci: '' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const { nombre, apellido, ci } = await request.json();

  db.update(profiles).set({
    nombre: nombre ?? '',
    apellido: apellido ?? '',
    ci: ci ?? '',
    updatedAt: sql`datetime('now')`,
  }).where(eq(profiles.userId, locals.user.userId)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
