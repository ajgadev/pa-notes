import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';
import { resolve } from 'path';
import * as schema from './schema';

const dbPath = process.env.DATABASE_URL || './data/petroalianza.db';
const sqlite = new Database(resolve(dbPath));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

function seed() {
  console.log('Seeding database...');

  // Users
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

    console.log('  Created user: admin / admin123');
  }

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

    console.log('  Created user: operador / op123');
  }

  // Departments
  const depts = [
    'Operaciones', 'Mantenimiento', 'Seguridad Industrial',
    'Logística', 'Administración', 'Ingeniería', 'Almacén',
  ];
  for (const name of depts) {
    db.insert(schema.departments).values({ name }).onConflictDoNothing().run();
  }
  console.log(`  Departments: ${depts.length} seeded`);

  // Personal
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
  console.log(`  Personal: ${people.length} seeded`);

  // Vehicles
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
  console.log(`  Vehicles: ${vehicles.length} seeded`);

  // Config
  db.insert(schema.config).values({ key: 'nota_counter', value: '1' }).onConflictDoNothing().run();
  db.insert(schema.config).values({ key: 'company_name', value: 'Petro Alianza' }).onConflictDoNothing().run();
  db.insert(schema.config).values({ key: 'nota_prefix', value: 'NS' }).onConflictDoNothing().run();
  console.log('  Config: nota_counter=1, company_name=Petro Alianza, nota_prefix=NS');

  console.log('Seed complete!');
}

seed();
sqlite.close();
