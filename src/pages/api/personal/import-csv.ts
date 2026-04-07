import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { personal } from '../../../lib/schema';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Solo admin puede importar personal' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return new Response(JSON.stringify({ error: 'Archivo requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const text = await file.text();
  const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim()));

  let start = 0;
  if (lines[0]?.[0]?.toLowerCase() === 'ci') start = 1;

  let imported = 0;
  let duplicates = 0;

  for (let i = start; i < lines.length; i++) {
    const [ci, nombre, apellido, cargo] = lines[i];
    if (!ci || !nombre) continue;
    try {
      db.insert(personal).values({ ci, nombre, apellido: apellido || '', cargo: cargo || '' }).run();
      imported++;
    } catch {
      duplicates++;
    }
  }

  return new Response(JSON.stringify({ success: true, imported, duplicates }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
