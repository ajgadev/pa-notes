import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { users, profiles, config } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../lib/auth';

export const GET: APIRoute = async () => {
  const allUsers = db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt,
    nombre: profiles.nombre,
    apellido: profiles.apellido,
    ci: profiles.ci,
  }).from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .all();

  // Attach reset tokens if active
  const result = allUsers.map((u) => {
    const tokenEntry = db.select().from(config)
      .where(eq(config.key, `reset_token_${u.username}`)).get();
    const expiryEntry = db.select().from(config)
      .where(eq(config.key, `reset_token_expiry_${u.username}`)).get();

    let resetToken = null;
    if (tokenEntry && expiryEntry) {
      const expiry = new Date(expiryEntry.value);
      if (expiry > new Date()) {
        resetToken = tokenEntry.value;
      }
    }

    return { ...u, resetToken };
  });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { username, password, role, nombre, apellido, ci } = body;
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Usuario y contraseña requeridos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return new Response(JSON.stringify({ error: 'El usuario ya existe' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }

    const newUser = db.insert(users).values({
      username,
      password: hashPassword(password),
      role: role || 'operador',
    }).returning().get();

    db.insert(profiles).values({
      userId: newUser.id,
      nombre: nombre || '',
      apellido: apellido || '',
      ci: ci || '',
    }).run();

    return new Response(JSON.stringify({ success: true, id: newUser.id }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'update') {
    const { id, role, active } = body;
    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;

    db.update(users).set(updates).where(eq(users.id, id)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'reset-password') {
    const { id, newPassword } = body;
    db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, id)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Acción no válida' }), {
    status: 400, headers: { 'Content-Type': 'application/json' },
  });
};
