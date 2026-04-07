import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../src/lib/schema';
import { hashPassword } from '../../src/lib/auth';

/**
 * Creates an in-memory SQLite database with the full schema and seed data.
 * Each test gets a fresh isolated database.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operador',
      email TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL DEFAULT '',
      apellido TEXT NOT NULL DEFAULT '',
      ci TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placa TEXT NOT NULL UNIQUE,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE personal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ci TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL DEFAULT '',
      cargo TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL UNIQUE,
      estado TEXT NOT NULL DEFAULT 'Vigente',
      departamento TEXT DEFAULT '',
      fecha TEXT,
      empresa TEXT NOT NULL DEFAULT 'Petro Alianza',
      base TEXT NOT NULL DEFAULT 'Oriente',
      pozo TEXT DEFAULT '',
      taladro TEXT DEFAULT '',
      tipo_salida TEXT NOT NULL,
      solicitante TEXT NOT NULL,
      destino TEXT NOT NULL,
      v_placa TEXT DEFAULT '',
      v_marca TEXT DEFAULT '',
      v_modelo TEXT DEFAULT '',
      c_nombre TEXT DEFAULT '',
      c_ci TEXT DEFAULT '',
      g_nombre TEXT DEFAULT '',
      g_ci TEXT DEFAULT '',
      s_nombre TEXT DEFAULT '',
      s_ci TEXT DEFAULT '',
      elab_nombre TEXT DEFAULT '',
      elab_ci TEXT DEFAULT '',
      apro_nombre TEXT DEFAULT '',
      apro_ci TEXT DEFAULT '',
      creado_por INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE nota_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_id INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
      orden INTEGER NOT NULL,
      no_parte TEXT DEFAULT '',
      unidad INTEGER NOT NULL DEFAULT 1,
      cantidad INTEGER NOT NULL DEFAULT 1,
      descripcion TEXT NOT NULL,
      no_serial TEXT DEFAULT ''
    );

    CREATE TABLE config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const db = drizzle(sqlite, { schema });

  // Seed minimal data
  const adminHash = hashPassword('admin123');
  const operadorHash = hashPassword('operador123');

  sqlite.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`).run('admin', adminHash, 'admin');
  sqlite.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`).run('operador', operadorHash, 'operador');
  sqlite.prepare(`INSERT INTO users (username, password, role, active) VALUES (?, ?, ?, ?)`).run('inactivo', operadorHash, 'operador', 0);

  sqlite.prepare(`INSERT INTO profiles (user_id, nombre, apellido, ci) VALUES (?, ?, ?, ?)`).run(1, 'Admin', 'User', '12345678');
  sqlite.prepare(`INSERT INTO profiles (user_id, nombre, apellido, ci) VALUES (?, ?, ?, ?)`).run(2, 'Operador', 'Test', '87654321');

  sqlite.prepare(`INSERT INTO config (key, value) VALUES (?, ?)`).run('nota_counter', '1');
  sqlite.prepare(`INSERT INTO config (key, value) VALUES (?, ?)`).run('nota_prefix', 'NS');
  sqlite.prepare(`INSERT INTO config (key, value) VALUES (?, ?)`).run('company_name', 'PetroAlianza');

  sqlite.prepare(`INSERT INTO departments (name) VALUES (?)`).run('Wireline');
  sqlite.prepare(`INSERT INTO departments (name) VALUES (?)`).run('Operaciones');

  sqlite.prepare(`INSERT INTO vehicles (placa, marca, modelo) VALUES (?, ?, ?)`).run('ABC123', 'Toyota', 'Hilux');

  sqlite.prepare(`INSERT INTO personal (ci, nombre, apellido, cargo) VALUES (?, ?, ?, ?)`).run('11111111', 'Juan', 'Pérez', 'Conductor');

  return { db, sqlite };
}
