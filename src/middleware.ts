import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import { isPublicPath, isAdminPath } from './lib/middleware';

export const onRequest = defineMiddleware((context, next) => {
  const path = context.url.pathname;

  // Public paths — no auth needed
  if (isPublicPath(path)) return next();

  // Check JWT
  const cookie = context.cookies.get('token');
  const user = cookie ? verifyToken(cookie.value) : null;

  if (!user) {
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

  return next();
});
