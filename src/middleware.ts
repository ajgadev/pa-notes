import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { isPublicPath, isAdminPath } from './lib/middleware';
import { logger } from './lib/logger';
import { db } from './lib/db';
import { users } from './lib/schema';
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
