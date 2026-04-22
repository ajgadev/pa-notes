import type { APIRoute } from 'astro';
import { db, sqlite } from '../../../lib/db';
import { notifications } from '../../../lib/schema';
import { eq, and, desc } from 'drizzle-orm';

const CLEANUP_DAYS = 30;

function cleanupOldNotifications(userId: number) {
  sqlite.prepare(
    "DELETE FROM notifications WHERE user_id = ? AND read = 1 AND created_at < datetime('now', ?)"
  ).run(userId, `-${CLEANUP_DAYS} days`);
}

export const GET: APIRoute = async ({ locals, url }) => {
  const userId = locals.user.userId;

  // Passively clean up old read notifications
  cleanupOldNotifications(userId);

  const unreadOnly = url.searchParams.get('unread') === '1';

  if (unreadOnly) {
    const count = db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .all().length;
    return new Response(JSON.stringify({ unread: count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const limit = parseInt(url.searchParams.get('limit') || '20');
  const rows = db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();

  return new Response(JSON.stringify({ data: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ locals, request }) => {
  const userId = locals.user.userId;
  const body = await request.json();

  if (body.all) {
    db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .run();
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    for (const id of body.ids) {
      db.update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .run();
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ locals }) => {
  db.delete(notifications)
    .where(and(eq(notifications.userId, locals.user.userId), eq(notifications.read, true)))
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
