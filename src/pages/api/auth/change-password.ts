import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '../../../lib/auth';
import { validatePassword } from '../../../lib/password-policy';

export const POST: APIRoute = async ({ request, locals }) => {
  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'Contraseña actual y nueva requeridas' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const err = validatePassword(newPassword);
  if (err) {
    return new Response(JSON.stringify({ error: err }), {
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
