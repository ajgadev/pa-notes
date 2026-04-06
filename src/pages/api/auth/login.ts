import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Usuario y contraseña requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = db.select().from(users).where(eq(users.username, username)).get();

  if (!user || !verifyPassword(password, user.password)) {
    return new Response(JSON.stringify({ error: 'Credenciales incorrectas' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!user.active) {
    return new Response(JSON.stringify({ error: 'Usuario desactivado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = createToken({
    userId: user.id,
    username: user.username,
    role: user.role as 'admin' | 'operador',
  });

  cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: false, // local network, no HTTPS
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return new Response(JSON.stringify({ success: true, role: user.role }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
