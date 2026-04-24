import type { APIContext } from 'astro';
import { verifyToken, type JwtPayload } from './auth';

const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/reset-request', '/api/auth/reset-password', '/cambiar-clave'];
const ADMIN_PREFIXES = ['/admin', '/api/usuarios', '/api/config'];

export function getUser(context: APIContext): JwtPayload | null {
  const cookie = context.cookies.get('token');
  if (!cookie) return null;
  return verifyToken(cookie.value);
}

export function requireAuth(context: APIContext): JwtPayload {
  const user = getUser(context);
  if (!user) {
    throw new Response(null, { status: 302, headers: { Location: '/login' } });
  }
  return user;
}

export function requireAdmin(context: APIContext): JwtPayload {
  const user = requireAuth(context);
  if (user.role !== 'admin') {
    throw new Response('Forbidden', { status: 403 });
  }
  return user;
}

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.includes(path)) return true;
  if (path.startsWith('/login/recuperar')) return true;
  if (path.startsWith('/firmar')) return true;
  if (path.startsWith('/api/firmar')) return true;
  return false;
}

export function isAdminPath(path: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function getPublicBaseUrl(request: Request, url: URL): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  return `${proto}://${host}`;
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim());
    return parts[parts.length - 1] || 'unknown';
  }
  return 'unknown';
}
