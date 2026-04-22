import { defineMiddleware } from 'astro:middleware';
import { verifyToken, createToken } from './lib/auth';
import { isPublicPath, isAdminPath } from './lib/middleware';
import { logger } from './lib/logger';
import { db } from './lib/db';
import { users, config } from './lib/schema';
import { eq } from 'drizzle-orm';

function addSecurityHeaders(res: Response): Response {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const method = context.request.method;
  const start = Date.now();

  // Public paths — no auth needed
  if (isPublicPath(path)) {
    const res = await next();
    addSecurityHeaders(res);
    if (method !== 'GET' || !path.startsWith('/api/')) return res;
    logger.info(`${method} ${path}`, { status: res.status, ms: Date.now() - start });
    return res;
  }

  // Check JWT
  const cookie = context.cookies.get('token');
  const user = cookie ? verifyToken(cookie.value) : null;

  if (!user) {
    logger.warn(`Unauthorized ${method} ${path}`);
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/login');
  }

  // Force password change check
  if (path !== '/cambiar-clave' && !path.startsWith('/api/auth/force-change-password') && !path.startsWith('/api/auth/logout')) {
    const userRow = db.select({ mustChangePassword: users.mustChangePassword }).from(users).where(eq(users.id, user.userId)).get();
    if (userRow?.mustChangePassword) {
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Debe cambiar su contraseña' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/cambiar-clave');
    }
  }

  // Admin-only paths
  if (isAdminPath(path) && user.role !== 'admin') {
    logger.warn(`Forbidden ${method} ${path}`, { user: user.username, role: user.role });
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/dashboard');
  }

  // Sliding session: refresh token on each request to extend expiry
  const tokenPayload = user as any;
  if (tokenPayload.iat) {
    const timeoutRow = db.select().from(config).where(eq(config.key, 'session_timeout_min')).get();
    const timeoutMin = parseInt(timeoutRow?.value || '480'); // default 8h
    const ageMin = (Date.now() / 1000 - tokenPayload.iat) / 60;

    if (ageMin > timeoutMin) {
      context.cookies.delete('token', { path: '/' });
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Sesión expirada' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/login');
    }

    // Refresh token if older than half the timeout
    if (ageMin > timeoutMin / 2) {
      const freshToken = createToken({ userId: user.userId, username: user.username, role: user.role });
      context.cookies.set('token', freshToken, {
        httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', path: '/', maxAge: timeoutMin * 60,
      });
    }
  }

  // CSRF protection for state-changing requests
  const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (MUTATION_METHODS.includes(method) && path.startsWith('/api/')) {
    const origin = context.request.headers.get('origin');
    const host = context.url.host;
    if (origin && new URL(origin).host !== host) {
      logger.warn(`CSRF blocked ${method} ${path}`, { origin, host, user: user.username });
      return new Response(JSON.stringify({ error: 'Solicitud rechazada (CSRF)' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Attach user to locals
  context.locals.user = user;

  const res = await next();
  addSecurityHeaders(res);

  // Log API requests
  if (path.startsWith('/api/')) {
    logger.info(`${method} ${path}`, { user: user.username, status: res.status, ms: Date.now() - start });
  }

  return res;
});
