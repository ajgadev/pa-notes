import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  role: text('role', { enum: ['admin', 'operador'] }).notNull().default('operador'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull().default(''),
  apellido: text('apellido').notNull().default(''),
  ci: text('ci').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  placa: text('placa').unique().notNull(),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const personal = sqliteTable('personal', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ci: text('ci').unique().notNull(),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull().default(''),
  cargo: text('cargo').notNull().default(''),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const notas = sqliteTable('notas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: integer('numero').unique().notNull(),
  estado: text('estado', { enum: ['Vigente', 'Nula'] }).notNull().default('Vigente'),
  departamento: text('departamento').default(''),
  fecha: text('fecha'),
  empresa: text('empresa').notNull().default('Petro Alianza'),
  base: text('base').notNull().default('Oriente'),
  pozo: text('pozo').default(''),
  taladro: text('taladro').default(''),
  tipoSalida: text('tipo_salida').notNull(),
  solicitante: text('solicitante').notNull(),
  destino: text('destino').notNull(),
  vPlaca: text('v_placa').default(''),
  vMarca: text('v_marca').default(''),
  vModelo: text('v_modelo').default(''),
  cNombre: text('c_nombre').default(''),
  cCi: text('c_ci').default(''),
  gNombre: text('g_nombre').default(''),
  gCi: text('g_ci').default(''),
  sNombre: text('s_nombre').default(''),
  sCi: text('s_ci').default(''),
  elabNombre: text('elab_nombre').default(''),
  elabCi: text('elab_ci').default(''),
  aproNombre: text('apro_nombre').default(''),
  aproCi: text('apro_ci').default(''),
  creadoPor: integer('creado_por').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const notaItems = sqliteTable('nota_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notaId: integer('nota_id').notNull().references(() => notas.id, { onDelete: 'cascade' }),
  orden: integer('orden').notNull(),
  noParte: text('no_parte').default(''),
  unidad: integer('unidad').notNull().default(1),
  cantidad: integer('cantidad').notNull().default(1),
  descripcion: text('descripcion').notNull(),
  noSerial: text('no_serial').default(''),
});

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
