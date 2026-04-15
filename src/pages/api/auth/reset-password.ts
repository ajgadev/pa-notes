import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users, config } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const { token, newPassword } = await request.json();

  if (!token || !newPassword) {
    return new Response(JSON.stringify({ error: 'Token y nueva contraseña requeridos' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (newPassword.length < 8) {
    return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Find which user this token belongs to
  const allTokens = db.select().from(config).all()
    .filter(c => c.key.startsWith('reset_token_') && !c.key.includes('expiry') && c.value === token);

  if (allTokens.length === 0) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const tokenEntry = allTokens[0];
  const username = tokenEntry.key.replace('reset_token_', '');

  // Check expiry
  const expiryEntry = db.select().from(config).where(eq(config.key, `reset_token_expiry_${username}`)).get();
  if (!expiryEntry || new Date(expiryEntry.value) < new Date()) {
    return new Response(JSON.stringify({ error: 'Token expirado' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update password
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, user.id)).run();

  // Clean up tokens
  db.delete(config).where(eq(config.key, `reset_token_${username}`)).run();
  db.delete(config).where(eq(config.key, `reset_token_expiry_${username}`)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
