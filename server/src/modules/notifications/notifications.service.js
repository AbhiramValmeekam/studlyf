import { AppError } from '../../common/errors/app-error.js';
import * as repo from './notifications.repository.js';

function toPublic(row) {
  return {
    id: String(row._id),
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    data: row.data ?? {},
    read: !!row.readAt,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt,
  };
}

/**
 * In-app notification (no email/push). Pass a `dedupeKey` for event notifications: the same
 * (user, key) pair is only ever stored once, so retries and repeated transitions don't spam.
 * Returns the notification, or null when it was a duplicate.
 */
export async function createNotification(db, { userId, type, title, body = null, data = {}, dedupeKey = null }) {
  try {
    return await repo.insert(db, { userId, type, title, body, data, dedupeKey });
  } catch (err) {
    if (dedupeKey && err?.code === 11000) return null;
    throw err;
  }
}

/** Notify several users about the same event (deduplicated per user). */
export async function notifyMany(db, userIds, { type, title, body = null, data = {}, dedupeKey = null }) {
  const unique = [...new Set(userIds.map(String))];
  await Promise.all(
    unique.map((userId) =>
      createNotification(db, { userId, type, title, body, data, dedupeKey: dedupeKey ? `${dedupeKey}:${userId}` : null }),
    ),
  );
}

export async function list(db, userId, { unread, page, pageSize }) {
  const filter = { userId };
  if (unread) filter.readAt = null;
  const [rows, total, unreadCount] = await Promise.all([
    repo.list(db, filter, { page, pageSize }),
    repo.count(db, filter),
    repo.count(db, { userId, readAt: null }),
  ]);
  return { items: rows.map(toPublic), total, unreadCount };
}

export async function markRead(db, userId, id) {
  const row = await repo.findOwned(db, userId, id);
  if (!row) throw AppError.notFound('Notification');
  if (!row.readAt) await repo.markRead(db, id);
  return { id, read: true };
}

export async function markAllRead(db, userId) {
  const { modifiedCount } = await repo.markAllRead(db, userId);
  return { updated: modifiedCount ?? 0 };
}
