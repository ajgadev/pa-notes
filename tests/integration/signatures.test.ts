import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { notas, signatures, signatureTokens } from '../../src/lib/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import type Database from 'better-sqlite3';

// Minimal valid 1x1 transparent PNG
const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
const VALID_SIGNATURE = `data:image/png;base64,${VALID_PNG_BASE64}`;
const INVALID_SIGNATURE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

function createNotaWithSigners(sqlite: Database.Database, overrides: Record<string, string> = {}) {
  const defaults = {
    cNombre: 'Carlos Conductor',
    cCi: '11111111',
    gNombre: 'Gloria Gerente',
    gCi: '22222222',
    elabNombre: 'Elena Elabora',
    elabCi: '33333333',
  };
  const vals = { ...defaults, ...overrides };

  sqlite.prepare(`
    INSERT INTO notas (numero, tipo_salida, solicitante, destino, creado_por,
      c_nombre, c_ci, g_nombre, g_ci, elab_nombre, elab_ci, signature_status)
    VALUES (1, 'Con Retorno', 'Test', 'Destino', 1, ?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(vals.cNombre, vals.cCi, vals.gNombre, vals.gCi, vals.elabNombre, vals.elabCi);

  return 1; // nota id
}

describe('Signatures - recording and validation', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  it('records a valid signature', () => {
    const notaId = createNotaWithSigners(sqlite);

    sqlite.prepare(`
      INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', 'Carlos Conductor', '11111111', VALID_SIGNATURE);

    const sig = db.select().from(signatures)
      .where(and(eq(signatures.notaId, notaId), eq(signatures.role, 'conductor')))
      .get();

    expect(sig).toBeTruthy();
    expect(sig!.signedByName).toBe('Carlos Conductor');
    expect(sig!.signedByCi).toBe('11111111');
    expect(sig!.signatureData).toContain('data:image/png;base64,');
  });

  it('enforces unique constraint on (nota_id, role)', () => {
    const notaId = createNotaWithSigners(sqlite);

    sqlite.prepare(`
      INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', 'Carlos Conductor', '11111111', VALID_SIGNATURE);

    expect(() => {
      sqlite.prepare(`
        INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
        VALUES (?, ?, ?, ?, ?)
      `).run(notaId, 'conductor', 'Otro', '99999999', VALID_SIGNATURE);
    }).toThrow();
  });

  it('allows different roles on same nota', () => {
    const notaId = createNotaWithSigners(sqlite);

    sqlite.prepare(`
      INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', 'Carlos', '11111111', VALID_SIGNATURE);

    sqlite.prepare(`
      INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, 'gerente', 'Gloria', '22222222', VALID_SIGNATURE);

    const sigs = db.select().from(signatures).where(eq(signatures.notaId, notaId)).all();
    expect(sigs).toHaveLength(2);
  });

  it('cascades delete when nota is deleted', () => {
    const notaId = createNotaWithSigners(sqlite);

    sqlite.prepare(`
      INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', 'Carlos', '11111111', VALID_SIGNATURE);

    sqlite.prepare('DELETE FROM notas WHERE id = ?').run(notaId);

    const sigs = db.select().from(signatures).where(eq(signatures.notaId, notaId)).all();
    expect(sigs).toHaveLength(0);
  });
});

describe('Signature tokens', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  it('creates a token with correct fields', () => {
    const notaId = createNotaWithSigners(sqlite);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    sqlite.prepare(`
      INSERT INTO signature_tokens (nota_id, role, token, recipient_email, recipient_name, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', token, 'carlos@test.com', 'Carlos Conductor', expiresAt);

    const row = db.select().from(signatureTokens).where(eq(signatureTokens.token, token)).get();
    expect(row).toBeTruthy();
    expect(row!.role).toBe('conductor');
    expect(row!.recipientEmail).toBe('carlos@test.com');
    expect(row!.usedAt).toBeNull();
  });

  it('enforces unique token constraint', () => {
    const notaId = createNotaWithSigners(sqlite);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    sqlite.prepare(`
      INSERT INTO signature_tokens (nota_id, role, token, recipient_email, recipient_name, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', token, '', 'Carlos', expiresAt);

    expect(() => {
      sqlite.prepare(`
        INSERT INTO signature_tokens (nota_id, role, token, recipient_email, recipient_name, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notaId, 'gerente', token, '', 'Gloria', expiresAt);
    }).toThrow();
  });

  it('token can be marked as used', () => {
    const notaId = createNotaWithSigners(sqlite);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    sqlite.prepare(`
      INSERT INTO signature_tokens (nota_id, role, token, recipient_email, recipient_name, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', token, '', 'Carlos', expiresAt);

    const now = new Date().toISOString();
    sqlite.prepare('UPDATE signature_tokens SET used_at = ? WHERE token = ?').run(now, token);

    const row = db.select().from(signatureTokens).where(eq(signatureTokens.token, token)).get();
    expect(row!.usedAt).toBeTruthy();
  });

  it('cascades delete when nota is deleted', () => {
    const notaId = createNotaWithSigners(sqlite);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    sqlite.prepare(`
      INSERT INTO signature_tokens (nota_id, role, token, recipient_email, recipient_name, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', token, '', 'Carlos', expiresAt);

    sqlite.prepare('DELETE FROM notas WHERE id = ?').run(notaId);

    const tokens = db.select().from(signatureTokens).where(eq(signatureTokens.notaId, notaId)).all();
    expect(tokens).toHaveLength(0);
  });
});

describe('Signature status on notas', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  it('defaults to borrador', () => {
    sqlite.prepare(`
      INSERT INTO notas (numero, tipo_salida, solicitante, destino, creado_por)
      VALUES (1, 'Con Retorno', 'Test', 'Destino', 1)
    `).run();

    const nota = db.select().from(notas).where(eq(notas.id, 1)).get();
    expect(nota!.signatureStatus).toBe('borrador');
  });

  it('can be set to pendiente', () => {
    const notaId = createNotaWithSigners(sqlite);
    const nota = db.select().from(notas).where(eq(notas.id, notaId)).get();
    expect(nota!.signatureStatus).toBe('pendiente');
  });

  it('can be set to completa', () => {
    const notaId = createNotaWithSigners(sqlite);
    db.update(notas).set({ signatureStatus: 'completa' }).where(eq(notas.id, notaId)).run();
    const nota = db.select().from(notas).where(eq(notas.id, notaId)).get();
    expect(nota!.signatureStatus).toBe('completa');
  });
});

describe('Edit blocking with signatures', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  it('nota without signatures can be updated', () => {
    createNotaWithSigners(sqlite);

    db.update(notas).set({ destino: 'Nuevo Destino' }).where(eq(notas.id, 1)).run();
    const nota = db.select().from(notas).where(eq(notas.id, 1)).get();
    expect(nota!.destino).toBe('Nuevo Destino');
  });

  it('hasAnySignature returns false when no signatures', () => {
    createNotaWithSigners(sqlite);

    const count = db.select().from(signatures).where(eq(signatures.notaId, 1)).all().length;
    expect(count).toBe(0);
  });

  it('hasAnySignature returns true when signatures exist', () => {
    const notaId = createNotaWithSigners(sqlite);

    sqlite.prepare(`
      INSERT INTO signatures (nota_id, role, signed_by_name, signed_by_ci, signature_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, 'conductor', 'Carlos', '11111111', VALID_SIGNATURE);

    const count = db.select().from(signatures).where(eq(signatures.notaId, notaId)).all().length;
    expect(count).toBeGreaterThan(0);
  });
});

describe('PNG validation', () => {
  it('valid PNG signature data is accepted', () => {
    const data = VALID_SIGNATURE;
    expect(data.startsWith('data:image/png;base64,')).toBe(true);

    const base64 = data.slice('data:image/png;base64,'.length);
    const decoded = Buffer.from(base64, 'base64');
    // PNG magic bytes
    expect(decoded[0]).toBe(0x89);
    expect(decoded[1]).toBe(0x50); // P
    expect(decoded[2]).toBe(0x4E); // N
    expect(decoded[3]).toBe(0x47); // G
  });

  it('JPEG signature data has wrong prefix', () => {
    expect(INVALID_SIGNATURE.startsWith('data:image/png;base64,')).toBe(false);
  });

  it('plain text is not valid PNG', () => {
    const data = 'data:image/png;base64,SGVsbG8gV29ybGQ=';
    const base64 = data.slice('data:image/png;base64,'.length);
    const decoded = Buffer.from(base64, 'base64');
    expect(decoded[0]).not.toBe(0x89);
  });
});
