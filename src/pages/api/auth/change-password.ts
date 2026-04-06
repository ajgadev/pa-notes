import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'Contraseña actual y nueva requeridas' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (newPassword.length < 4) {
    return new Response(JSON.stringify({ error: 'La nueva contraseña debe tener al menos 4 caracteres' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = db.select().from(users).where(eq(users.id, locals.user.userId)).get();
  if (!user || !verifyPassword(currentPassword, user.password)) {
    return new Response(JSON.stringify({ error: 'Contraseña actual incorrecta' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, locals.user.userId)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
