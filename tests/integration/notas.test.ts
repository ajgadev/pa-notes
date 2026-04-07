import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { notas, notaItems, config } from '../../src/lib/schema';
import { eq } from 'drizzle-orm';
import type Database from 'better-sqlite3';

describe('Notas - atomic counter and creation', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  function createNota(overrides: Record<string, any> = {}) {
    const body = {
      departamento: 'Wireline',
      fecha: '2026-02-18',
      empresa: 'PetroAlianza',
      base: 'Oriente',
      pozo: 'N/A',
      taladro: '',
      tipoSalida: 'Con Retorno',
      solicitante: 'Juan Pérez',
      destino: 'San José de Guanipa',
      items: [{ noParte: '', unidad: 1, cantidad: 2, descripcion: 'Tubo 3/4', noSerial: '' }],
      ...overrides,
    };

    const createNotaTx = sqlite.transaction(() => {
      const row = sqlite.prepare("SELECT value FROM config WHERE key = 'nota_counter'").get() as { value: string };
      const numero = parseInt(row.value, 10);
      sqlite.prepare("UPDATE config SET value = ? WHERE key = 'nota_counter'").run(String(numero + 1));

      const result = sqlite.prepare(`
        INSERT INTO notas (numero, departamento, fecha, empresa, base, pozo, taladro, tipo_salida, solicitante, destino, creado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        numero, body.departamento, body.fecha, body.empresa, body.base,
        body.pozo, body.taladro, body.tipoSalida, body.solicitante, body.destino, 1,
      );

      const notaId = result.lastInsertRowid;
      const insertItem = sqlite.prepare(`
        INSERT INTO nota_items (nota_id, orden, no_parte, unidad, cantidad, descripcion, no_serial)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        insertItem.run(notaId, i + 1, item.noParte || '', item.unidad || 1, item.cantidad || 1, item.descripcion, item.noSerial || '');
      }
      return { id: Number(notaId), numero };
    });

    return createNotaTx();
  }

  it('first nota gets numero 1 and counter increments to 2', () => {
    const result = createNota();
    expect(result.numero).toBe(1);

    const counter = db.select().from(config).where(eq(config.key, 'nota_counter')).get();
    expect(counter!.value).toBe('2');
  });

  it('sequential notas get incrementing numbers', () => {
    const r1 = createNota();
    const r2 = createNota();
    const r3 = createNota();

    expect(r1.numero).toBe(1);
    expect(r2.numero).toBe(2);
    expect(r3.numero).toBe(3);

    const counter = db.select().from(config).where(eq(config.key, 'nota_counter')).get();
    expect(counter!.value).toBe('4');
  });

  it('nota items are stored correctly', () => {
    const result = createNota({
      items: [
        { noParte: 'P001', unidad: 1, cantidad: 5, descripcion: 'Tubo 3/4', noSerial: 'SN-001' },
        { noParte: 'P002', unidad: 1, cantidad: 3, descripcion: 'Válvula', noSerial: '' },
      ],
    });

    const items = db.select().from(notaItems).where(eq(notaItems.notaId, result.id)).all();
    expect(items).toHaveLength(2);
    expect(items[0].descripcion).toBe('Tubo 3/4');
    expect(items[0].cantidad).toBe(5);
    expect(items[0].noSerial).toBe('SN-001');
    expect(items[1].orden).toBe(2);
  });

  it('nota defaults to Vigente', () => {
    const result = createNota();
    const nota = db.select().from(notas).where(eq(notas.id, result.id)).get();
    expect(nota!.estado).toBe('Vigente');
  });

  it('cascade deletes items when nota is deleted', () => {
    const result = createNota();
    const itemsBefore = db.select().from(notaItems).where(eq(notaItems.notaId, result.id)).all();
    expect(itemsBefore.length).toBeGreaterThan(0);

    sqlite.prepare('DELETE FROM notas WHERE id = ?').run(result.id);
    const itemsAfter = db.select().from(notaItems).where(eq(notaItems.notaId, result.id)).all();
    expect(itemsAfter).toHaveLength(0);
  });
});

describe('Notas - estado changes', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: Database.Database;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
    // Insert a nota directly
    sqlite.prepare(`
      INSERT INTO notas (numero, tipo_salida, solicitante, destino, creado_por)
      VALUES (1, 'Con Retorno', 'Test', 'Destino', 1)
    `).run();
  });

  it('can change estado to Nula', () => {
    db.update(notas).set({ estado: 'Nula' }).where(eq(notas.id, 1)).run();
    const nota = db.select().from(notas).where(eq(notas.id, 1)).get();
    expect(nota!.estado).toBe('Nula');
  });

  it('can restore estado to Vigente', () => {
    db.update(notas).set({ estado: 'Nula' }).where(eq(notas.id, 1)).run();
    db.update(notas).set({ estado: 'Vigente' }).where(eq(notas.id, 1)).run();
    const nota = db.select().from(notas).where(eq(notas.id, 1)).get();
    expect(nota!.estado).toBe('Vigente');
  });
});
