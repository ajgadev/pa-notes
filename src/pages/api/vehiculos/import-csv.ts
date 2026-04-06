import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { vehicles } from '../../../lib/schema';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return new Response(JSON.stringify({ error: 'Archivo requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const text = await file.text();
  const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim()));

  // Skip header if first row looks like labels
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

  return new Response(JSON.stringify({ success: true, imported, duplicates }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
