import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { config, notas } from '../../src/lib/schema';
import { eq } from 'drizzle-orm';
import type Database from 'better-sqlite3';

describe('Config - nota counter', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  it('reads initial counter value', () => {
    const row = db.select().from(config).where(eq(config.key, 'nota_counter')).get();
    expect(row!.value).toBe('1');
  });

  it('updates counter to valid value', () => {
    db.update(config).set({ value: '100' }).where(eq(config.key, 'nota_counter')).run();
    const row = db.select().from(config).where(eq(config.key, 'nota_counter')).get();
    expect(row!.value).toBe('100');
  });

  it('detects collision when nota with that number exists', () => {
    // Create a nota with numero 5
    sqlite.prepare(`
      INSERT INTO notas (numero, tipo_salida, solicitante, destino, creado_por)
      VALUES (5, 'Con Retorno', 'Test', 'Destino', 1)
    `).run();

    // Check collision
    const existing = db.select().from(notas).where(eq(notas.numero, 5)).get();
    expect(existing).toBeDefined();

    // Counter set to 5 should be rejected (business logic)
    const wouldCollide = existing !== undefined;
    expect(wouldCollide).toBe(true);
  });

  it('no collision for unused number', () => {
    const existing = db.select().from(notas).where(eq(notas.numero, 999)).get();
    expect(existing).toBeUndefined();
  });
});

describe('Config - company name and prefix', () => {
  let db: ReturnType<typeof createTestDb>['db'];

  beforeEach(() => {
    ({ db } = createTestDb());
  });

  it('reads initial company name', () => {
    const row = db.select().from(config).where(eq(config.key, 'company_name')).get();
    expect(row!.value).toBe('PetroAlianza');
  });

  it('updates company name', () => {
    db.update(config).set({ value: 'New Company' }).where(eq(config.key, 'company_name')).run();
    const row = db.select().from(config).where(eq(config.key, 'company_name')).get();
    expect(row!.value).toBe('New Company');
  });

  it('reads and updates nota prefix', () => {
    const row = db.select().from(config).where(eq(config.key, 'nota_prefix')).get();
    expect(row!.value).toBe('NS');

    db.update(config).set({ value: 'GE-M' }).where(eq(config.key, 'nota_prefix')).run();
    const updated = db.select().from(config).where(eq(config.key, 'nota_prefix')).get();
    expect(updated!.value).toBe('GE-M');
  });
});
