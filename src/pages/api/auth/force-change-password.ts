import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../lib/auth';
import { audit } from '../../../lib/audit';
import { validatePassword } from '../../../lib/password-policy';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  const body = await request.json();
  const { newPassword } = body;

  const err = validatePassword(newPassword);
  if (err) {
    return new Response(JSON.stringify({ error: err }), {
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
