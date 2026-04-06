import { hashSync, compareSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface JwtPayload {
  userId: number;
  username: string;
  role: 'admin' | 'operador';
}

export function hashPassword(password: string): string {
  return hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

export function createToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function generateResetToken(): string {
  return crypto.randomInt(100000, 999999).toString();
}
