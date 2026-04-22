import Database from 'better-sqlite3';
import { resolve } from 'path';
import { hashSync } from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

async function main() {
  const dbPath = process.env.DATABASE_URL || './data/petroalianza.db';
  const sqlite = new Database(resolve(dbPath));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  console.log('=== Crear Admin Oculto ===\n');

  const username = (await ask('Usuario: ')).trim();
  if (!username) {
    console.log('Usuario requerido.');
    process.exit(1);
  }

  const existing = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
  if (existing) {
    console.log('El usuario ya existe.');
    process.exit(1);
  }

  const password = (await ask('Contraseña (mín. 8 caracteres): ')).trim();
  if (password.length < 8) {
    console.log('Contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const hash = hashSync(password, 12);

  const result = sqlite
    .prepare('INSERT INTO users (username, password, role, hidden) VALUES (?, ?, ?, 1)')
    .run(username, hash, 'admin');

  sqlite
    .prepare('INSERT INTO profiles (user_id, nombre, apellido, ci) VALUES (?, ?, ?, ?)')
    .run(result.lastInsertRowid, '', '', '');

  console.log(`\nAdmin oculto "${username}" creado.`);

  rl.close();
  sqlite.close();
}

main();
