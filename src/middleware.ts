import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { isPublicPath, isAdminPath } from './lib/middleware';
import { logger } from './lib/logger';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const method = context.request.method;
  const start = Date.now();

  // Public paths — no auth needed
  if (isPublicPath(path)) {
    const res = await next();
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

  // Log API requests
  if (path.startsWith('/api/')) {
    logger.info(`${method} ${path}`, { user: user.username, status: res.status, ms: Date.now() - start });
  }

  return res;
});
