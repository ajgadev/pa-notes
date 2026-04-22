import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { profiles } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const PUT: APIRoute = async ({ request, locals }) => {
  const { signatureData } = await request.json();

  if (!signatureData || typeof signatureData !== 'string') {
    return new Response(JSON.stringify({ error: 'Firma requerida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (signatureData.length > 500 * 1024) {
    return new Response(JSON.stringify({ error: 'La firma excede el tamaño máximo (500KB)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = db.select().from(profiles).where(eq(profiles.userId, locals.user.userId)).get();

  if (existing) {
    db.update(profiles).set({
      savedSignature: signatureData,
      updatedAt: sql`datetime('now')`,
    }).where(eq(profiles.userId, locals.user.userId)).run();
  } else {
    db.insert(profiles).values({
      userId: locals.user.userId,
      savedSignature: signatureData,
    }).run();
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ locals }) => {
  db.update(profiles).set({
    savedSignature: null,
    updatedAt: sql`datetime('now')`,
  }).where(eq(profiles.userId, locals.user.userId)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
