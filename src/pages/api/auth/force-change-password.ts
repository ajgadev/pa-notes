import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../lib/auth';
import { audit } from '../../../lib/audit';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  const body = await request.json();
  const { newPassword } = body;

  if (!newPassword || newPassword.length < 8) {
    return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  db.update(users)
    .set({ password: hashPassword(newPassword), mustChangePassword: false })
    .where(eq(users.id, user.userId))
    .run();

  audit({ userId: user.userId, username: user.username, action: 'password_changed_forced' });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
