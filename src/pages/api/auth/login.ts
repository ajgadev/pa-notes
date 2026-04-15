import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createToken } from '../../../lib/auth';
import { logger } from '../../../lib/logger';
import { checkRateLimit } from '../../../lib/rate-limit';
import { audit } from '../../../lib/audit';

export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfterSec } = checkRateLimit(ip);

  if (!allowed) {
    logger.warn('Login rate limited', { ip });
    return new Response(JSON.stringify({ error: `Demasiados intentos. Intente de nuevo en ${Math.ceil((retryAfterSec || 900) / 60)} minutos.` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
    logger.warn('Login failed: bad credentials', { username });
    audit({ username: username || 'unknown', action: 'login_failed', detail: 'Bad credentials', ip });
    return new Response(JSON.stringify({ error: 'Credenciales incorrectas' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!user.active) {
    logger.warn('Login failed: user inactive', { username });
    audit({ userId: user.id, username, action: 'login_failed', detail: 'User inactive', ip });
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
    secure: request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https'),
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  logger.info('Login success', { username: user.username, role: user.role });
  audit({ userId: user.id, username: user.username, action: 'login', ip });

  return new Response(JSON.stringify({ success: true, role: user.role, mustChangePassword: !!user.mustChangePassword }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
