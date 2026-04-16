import Database from 'better-sqlite3';
import { resolve } from 'path';

const dbPath = process.env.DATABASE_URL || './data/petroalianza.db';
const sqlite = new Database(resolve(dbPath));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const tableExists = sqlite
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='solicitantes'`)
  .get();

if (!tableExists) {
  console.log('No solicitantes table found — nothing to migrate.');
  sqlite.close();
  process.exit(0);
}

const rows = sqlite
  .prepare(`SELECT ci, nombre, apellido, cargo, email, active FROM solicitantes`)
  .all() as Array<{
    ci: string; nombre: string; apellido: string;
    cargo: string; email: string; active: number;
  }>;

console.log(`Found ${rows.length} solicitantes — merging into personal...`);

const insert = sqlite.prepare(
  `INSERT INTO personal (ci, nombre, apellido, cargo, email, active)
   VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT(ci) DO NOTHING`
);

const tx = sqlite.transaction(() => {
  let merged = 0;
  let skipped = 0;
  for (const r of rows) {
    const result = insert.run(r.ci, r.nombre, r.apellido, r.cargo, r.email, r.active);
    if (result.changes > 0) merged++;
    else skipped++;
  }
  console.log(`  Insertados: ${merged}, omitidos (CI ya en personal): ${skipped}`);
  sqlite.exec(`DROP TABLE solicitantes`);
  console.log('  Tabla solicitantes eliminada.');
});

tx();
sqlite.close();
console.log('Done.');
