import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import * as schema from './schema';

const isProd = process.argv.includes('--prod');
const dbPath = process.env.DATABASE_URL || './data/petroalianza.db';
const sqlite = new Database(resolve(dbPath));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

function importCsv(filePath: string, type: 'departments' | 'vehicles' | 'personal') {
  if (!existsSync(filePath)) return;

  console.log(`  Importando ${type} desde ${filePath}...`);
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim()));

  // Skip header row if it looks like labels
  let start = 0;
  const firstCell = lines[0]?.[0]?.toLowerCase() || '';
  if (['nombre', 'name', 'placa', 'ci', 'departamento'].includes(firstCell)) start = 1;

  let imported = 0;
  let skipped = 0;

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i];
    try {
      if (type === 'departments') {
        const name = cols[0];
        if (!name) { skipped++; continue; }
        db.insert(schema.departments).values({ name }).onConflictDoNothing().run();
      } else if (type === 'vehicles') {
        const [placa, marca, modelo] = cols;
        if (!placa || !marca || !modelo) { skipped++; continue; }
        db.insert(schema.vehicles).values({ placa, marca, modelo }).onConflictDoNothing().run();
      } else if (type === 'personal') {
        // ci, nombre, apellido, cargo, email (all optional after ci+nombre)
        const [ci, nombre, apellido, cargo, email] = cols;
        if (!ci || !nombre) { skipped++; continue; }
        db.insert(schema.personal).values({
          ci, nombre, apellido: apellido || '', cargo: cargo || '', email: email || '',
        }).onConflictDoNothing().run();
      }
      imported++;
    } catch {
      skipped++;
    }
  }

  console.log(`    ${imported} importados, ${skipped} omitidos`);
}

function seed() {
  console.log(`Seeding database${isProd ? ' (producción)' : ' (desarrollo)'}...`);

  // === Admin user (always created) ===
  const existingAdmin = db.select().from(schema.users)
    .where(eq(schema.users.username, 'admin')).get();

  if (!existingAdmin) {
    const adminResult = db.insert(schema.users).values({
      username: 'admin',
      password: hashSync('admin123', 12),
      role: 'admin',
    }).returning().get();

    db.insert(schema.profiles).values({
      userId: adminResult.id,
      nombre: 'Administrador',
      apellido: 'Sistema',
      ci: '',
    }).run();

    console.log('  Creado usuario: admin / admin123');
  }

  // === Config (always created) ===
  db.insert(schema.config).values({ key: 'nota_counter', value: '1' }).onConflictDoNothing().run();
  db.insert(schema.config).values({ key: 'company_name', value: 'Petro Alianza' }).onConflictDoNothing().run();
  db.insert(schema.config).values({ key: 'nota_prefix', value: 'NS' }).onConflictDoNothing().run();
  console.log('  Config: nota_counter=1, company_name=Petro Alianza, nota_prefix=NS');

  // === Demo data (only in dev mode) ===
  if (!isProd) {
    const existingOp = db.select().from(schema.users)
      .where(eq(schema.users.username, 'operador')).get();

    if (!existingOp) {
      const opResult = db.insert(schema.users).values({
        username: 'operador',
        password: hashSync('op123', 12),
        role: 'operador',
      }).returning().get();

      db.insert(schema.profiles).values({
        userId: opResult.id,
        nombre: 'Operador',
        apellido: 'Demo',
        ci: '',
      }).run();

      console.log('  Creado usuario demo: operador / op123');
    }

    const depts = [
      'Operaciones', 'Mantenimiento', 'Seguridad Industrial',
      'Logística', 'Administración', 'Ingeniería', 'Almacén',
    ];
    for (const name of depts) {
      db.insert(schema.departments).values({ name }).onConflictDoNothing().run();
    }
    console.log(`  Departamentos demo: ${depts.length}`);

    const people = [
      { ci: 'V-12345678', nombre: 'Carlos', apellido: 'Rodríguez', cargo: 'Gerente General' },
      { ci: 'V-23456789', nombre: 'María', apellido: 'González', cargo: 'Jefe de Seguridad' },
      { ci: 'V-34567890', nombre: 'José', apellido: 'Martínez', cargo: 'Supervisor de Operaciones' },
      { ci: 'V-45678901', nombre: 'Ana', apellido: 'López', cargo: 'Coordinadora de Logística' },
      { ci: 'V-56789012', nombre: 'Pedro', apellido: 'Hernández', cargo: 'Conductor' },
    ];
    for (const p of people) {
      db.insert(schema.personal).values(p).onConflictDoNothing().run();
    }
    console.log(`  Personal demo: ${people.length}`);

    const vehicles = [
      { placa: 'AA123BC', marca: 'Toyota', modelo: 'Hilux 2022' },
      { placa: 'BB456DE', marca: 'Ford', modelo: 'Ranger 2021' },
      { placa: 'CC789FG', marca: 'Chevrolet', modelo: 'D-Max 2023' },
      { placa: 'DD012HI', marca: 'Mitsubishi', modelo: 'L200 2022' },
      { placa: 'EE345JK', marca: 'Nissan', modelo: 'Frontier 2023' },
    ];
    for (const v of vehicles) {
      db.insert(schema.vehicles).values(v).onConflictDoNothing().run();
    }
    console.log(`  Vehículos demo: ${vehicles.length}`);
  }

  // === Auto-import CSVs from data/ folder ===
  const dataDir = resolve(dbPath, '..');
  importCsv(resolve(dataDir, 'departments.csv'), 'departments');
  importCsv(resolve(dataDir, 'vehicles.csv'), 'vehicles');
  importCsv(resolve(dataDir, 'personal.csv'), 'personal');

  console.log('Seed completo!');
}

seed();
sqlite.close();
