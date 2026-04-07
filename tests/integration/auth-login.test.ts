import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { verifyPassword, createToken, verifyToken } from '../../src/lib/auth';
import { users } from '../../src/lib/schema';
import { eq } from 'drizzle-orm';

describe('Auth login flow', () => {
  let db: ReturnType<typeof createTestDb>['db'];

  beforeEach(() => {
    ({ db } = createTestDb());
  });

  it('admin user exists with correct credentials', () => {
    const user = db.select().from(users).where(eq(users.username, 'admin')).get();
    expect(user).toBeDefined();
    expect(verifyPassword('admin123', user!.password)).toBe(true);
    expect(user!.role).toBe('admin');
  });

  it('operador user exists with correct credentials', () => {
    const user = db.select().from(users).where(eq(users.username, 'operador')).get();
    expect(user).toBeDefined();
    expect(verifyPassword('operador123', user!.password)).toBe(true);
    expect(user!.role).toBe('operador');
  });

  it('rejects wrong password', () => {
    const user = db.select().from(users).where(eq(users.username, 'admin')).get();
    expect(verifyPassword('wrongpassword', user!.password)).toBe(false);
  });

  it('detects inactive user', () => {
    const user = db.select().from(users).where(eq(users.username, 'inactivo')).get();
    expect(user).toBeDefined();
    expect(user!.active).toBe(false);
  });

  it('non-existent user returns undefined', () => {
    const user = db.select().from(users).where(eq(users.username, 'noexiste')).get();
    expect(user).toBeUndefined();
  });

  it('creates valid JWT for authenticated user', () => {
    const user = db.select().from(users).where(eq(users.username, 'admin')).get()!;
    const token = createToken({ userId: user.id, username: user.username, role: user.role as 'admin' });
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(user.id);
    expect(decoded!.role).toBe('admin');
  });
});
