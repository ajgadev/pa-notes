import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { vehicles } from '../../src/lib/schema';
import type Database from 'better-sqlite3';

describe('Vehiculos CSV import logic', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  function importCsv(csvText: string) {
    const lines = csvText.trim().split('\n').map(l => l.split(',').map(c => c.trim()));
    let start = 0;
    if (lines[0]?.[0]?.toLowerCase() === 'placa') start = 1;

    let imported = 0;
    let duplicates = 0;

    for (let i = start; i < lines.length; i++) {
      const [placa, marca, modelo] = lines[i];
      if (!placa || !marca || !modelo) continue;
      try {
        db.insert(vehicles).values({ placa, marca, modelo }).run();
        imported++;
      } catch {
        duplicates++;
      }
    }

    return { imported, duplicates };
  }

  it('imports valid CSV with header', () => {
    const csv = `placa,marca,modelo
XYZ789,Ford,F-150
DEF456,Chevrolet,Silverado`;

    const result = importCsv(csv);
    expect(result.imported).toBe(2);
    expect(result.duplicates).toBe(0);

    const all = db.select().from(vehicles).all();
    // 1 from seed + 2 imported
    expect(all).toHaveLength(3);
  });

  it('imports CSV without header', () => {
    const csv = `XYZ789,Ford,F-150`;
    const result = importCsv(csv);
    expect(result.imported).toBe(1);
  });

  it('detects duplicates (placa already exists)', () => {
    const csv = `ABC123,Toyota,Hilux`; // already in seed
    const result = importCsv(csv);
    expect(result.imported).toBe(0);
    expect(result.duplicates).toBe(1);
  });

  it('skips incomplete rows', () => {
    const csv = `placa,marca,modelo
XYZ789,Ford,F-150
INCOMPLETE,OnlyMarca
,,,`;

    const result = importCsv(csv);
    expect(result.imported).toBe(1);
  });

  it('handles mixed valid, duplicate, and invalid rows', () => {
    const csv = `placa,marca,modelo
XYZ789,Ford,F-150
ABC123,Toyota,Hilux
,BadRow,
DEF456,Chevrolet,Silverado`;

    const result = importCsv(csv);
    expect(result.imported).toBe(2);
    expect(result.duplicates).toBe(1);
  });
});
