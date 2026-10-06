import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { SAVE_TARGETS, targetOf } from './registry.js';
import * as repo from './saved.repository.js';

/**
 * Saved items (spec §57) — one place the whole platform saves to. The service is thin on
 * purpose: the per-entity knowledge lives in the registry, so this file only knows about
 * ordering, visibility and the page envelope.
 */

/** May this user save this thing? Same predicate the entity's public page uses, so no. */
async function assertSaveable(db, entityType, entityId) {
  const target = targetOf(entityType);
  const exists = await db[target.model].exists({ _id: entityId, ...target.match() });
  if (!exists) throw AppError.notFound('Item');
}

export async function save(db, userId, { entityType, entityId }) {
  await assertSaveable(db, entityType, entityId);
  await repo.add(db, { userId, entityType, entityId });
  return { entityType, entityId: String(entityId), saved: true };
}

/**
 * Idempotent by design: unsaving something already gone is the state the caller asked for, not an
 * error. Only a caller who never saved it learns nothing changed.
 */
export async function unsave(db, userId, { entityType, entityId }) {
  targetOf(entityType);
  const { deletedCount } = await repo.remove(db, userId, entityType, entityId);
  return { entityType, entityId: String(entityId), saved: false, removed: deletedCount ?? 0 };
}

/**
 * Cards for a page of saved rows. A saved item whose target has since been unpublished, made
 * private or deleted is dropped rather than rendered as a dead link — the row stays, so
 * republishing the target brings it back.
 */
async function decorate(db, rows) {
  const byType = new Map();
  for (const row of rows) {
    const list = byType.get(row.entityType) ?? [];
    list.push(row);
    byType.set(row.entityType, list);
  }

  const items = [];
  for (const [entityType, group] of byType) {
    const target = SAVE_TARGETS[entityType];
    if (!target) continue; // a type retired from the registry: ignore its stale rows
    const found = await db[target.model]
      .find({ _id: { $in: group.map((r) => r.entityId) }, ...target.match() })
      .lean();
    const byId = new Map(found.map((d) => [String(d._id), d]));

    const pairs = group
      .map((row) => ({ row, doc: byId.get(String(row.entityId)) }))
      .filter((p) => p.doc);
    const cards = await target.cards(db, pairs.map((p) => p.doc));

    pairs.forEach((p, i) => {
      items.push({
        entityType,
        entityId: String(p.doc._id),
        savedAt: p.row.savedAt,
        href: target.href(p.doc),
        item: cards[i],
      });
    });
  }

  items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  return items;
}

export async function list(db, userId, { entityType, page, pageSize }) {
  const filter = entityType ? { entityType } : {};
  const [rows, total, counts] = await Promise.all([
    repo.list(db, userId, filter, { skip: (page - 1) * pageSize, limit: pageSize }),
    repo.count(db, userId, filter),
    countsByType(db, userId),
  ]);
  return { items: await decorate(db, rows), total, counts };
}

/** How many of each type this user has saved — drives the filter chips, over all pages. */
async function countsByType(db, userId) {
  const rows = await db.SavedItem.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: '$entityType', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

/** Whether each of `ids` is saved — so a listing can render its bookmark state without N queries. */
export async function savedIds(db, userId, entityType, ids) {
  targetOf(entityType);
  const set = await repo.idSet(db, userId, entityType, ids);
  return [...set];
}

/** Every saved row of one type for this user — how the investor shortlist reads its own list. */
export async function idsOfType(db, userId, entityType) {
  targetOf(entityType);
  return repo.idsOfType(db, userId, entityType);
}
