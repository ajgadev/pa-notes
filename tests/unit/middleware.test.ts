import { describe, it, expect } from 'vitest';
import { isPublicPath, isAdminPath } from '../../src/lib/middleware';

describe('isPublicPath', () => {
  it('returns true for root', () => {
    expect(isPublicPath('/')).toBe(true);
  });

  it('returns true for login page', () => {
    expect(isPublicPath('/login')).toBe(true);
  });

  it('returns true for login API', () => {
    expect(isPublicPath('/api/auth/login')).toBe(true);
  });

  it('returns true for password reset endpoints', () => {
    expect(isPublicPath('/api/auth/reset-request')).toBe(true);
    expect(isPublicPath('/api/auth/reset-password')).toBe(true);
  });

  it('returns true for recovery pages', () => {
    expect(isPublicPath('/login/recuperar')).toBe(true);
    expect(isPublicPath('/login/recuperar/123456')).toBe(true);
  });

  it('returns false for protected paths', () => {
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/notas')).toBe(false);
    expect(isPublicPath('/admin/usuarios')).toBe(false);
    expect(isPublicPath('/perfil')).toBe(false);
  });
});

describe('isAdminPath', () => {
  it('returns true for admin pages', () => {
    expect(isAdminPath('/admin/usuarios')).toBe(true);
    expect(isAdminPath('/admin/departamentos')).toBe(true);
    expect(isAdminPath('/admin/vehiculos')).toBe(true);
    expect(isAdminPath('/admin/configuracion')).toBe(true);
  });

  it('returns true for admin API endpoints', () => {
    expect(isAdminPath('/api/usuarios')).toBe(true);
    expect(isAdminPath('/api/config')).toBe(true);
  });

  it('returns false for non-admin paths', () => {
    expect(isAdminPath('/dashboard')).toBe(false);
    expect(isAdminPath('/notas')).toBe(false);
    expect(isAdminPath('/api/notas')).toBe(false);
    expect(isAdminPath('/perfil')).toBe(false);
  });
});
