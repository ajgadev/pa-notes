import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users, config } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { generateResetToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const { username } = await request.json();

  if (!username) {
    return new Response(JSON.stringify({ error: 'Usuario requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user) {
    // Don't reveal if user exists
    return new Response(JSON.stringify({ success: true, message: 'Si el usuario existe, se generó un token de recuperación.' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = generateResetToken();
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  // Upsert token
  const tokenKey = `reset_token_${username}`;
  const expiryKey = `reset_token_expiry_${username}`;

  db.insert(config).values({ key: tokenKey, value: token })
    .onConflictDoUpdate({ target: config.key, set: { value: token } }).run();
  db.insert(config).values({ key: expiryKey, value: expiry })
    .onConflictDoUpdate({ target: config.key, set: { value: expiry } }).run();

  return new Response(JSON.stringify({ success: true, message: 'Token generado. Contacte al administrador para obtenerlo.' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
