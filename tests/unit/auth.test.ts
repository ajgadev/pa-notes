import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  generateResetToken,
} from '../../src/lib/auth';

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies correctly', () => {
    const hash = hashPassword('mypassword');
    expect(hash).not.toBe('mypassword');
    expect(verifyPassword('mypassword', hash)).toBe(true);
  });

  it('rejects wrong password', () => {
    const hash = hashPassword('correct');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for same password (salted)', () => {
    const h1 = hashPassword('same');
    const h2 = hashPassword('same');
    expect(h1).not.toBe(h2);
  });
});

describe('createToken / verifyToken', () => {
  const payload = { userId: 1, username: 'admin', role: 'admin' as const };

  it('creates a valid JWT that can be verified', () => {
    const token = createToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(1);
    expect(decoded!.username).toBe('admin');
    expect(decoded!.role).toBe('admin');
  });

  it('returns null for invalid token', () => {
    expect(verifyToken('garbage')).toBeNull();
  });

  it('returns null for tampered token', () => {
    const token = createToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifyToken(tampered)).toBeNull();
  });
});

describe('generateResetToken', () => {
  it('returns a 6-digit string', () => {
    const token = generateResetToken();
    expect(token).toMatch(/^\d{6}$/);
  });

  it('generates different tokens', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateResetToken()));
    expect(tokens.size).toBeGreaterThan(1);
  });
});
