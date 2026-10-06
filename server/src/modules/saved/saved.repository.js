/** Every query is scoped by userId — a saved list is private to the user who made it. */

export function list(db, userId, filter, { skip, limit }) {
  return db.SavedItem.find({ userId, ...filter }).sort({ savedAt: -1, _id: -1 }).skip(skip).limit(limit).lean();
}

export function count(db, userId, filter) {
  return db.SavedItem.countDocuments({ userId, ...filter });
}

export function exists(db, userId, entityType, entityId) {
  return db.SavedItem.exists({ userId, entityType, entityId });
}

/** Idempotent: a second save of the same thing is a no-op, not a duplicate. */
export function add(db, { userId, entityType, entityId }) {
  return db.SavedItem.updateOne(
    { userId, entityType, entityId },
    { $setOnInsert: { userId, entityType, entityId, savedAt: new Date() } },
    { upsert: true },
  );
}

export function remove(db, userId, entityType, entityId) {
  return db.SavedItem.deleteOne({ userId, entityType, entityId });
}

/** The set of entity ids this user has saved of one type — for decorating a listing with "saved". */
export async function idSet(db, userId, entityType, ids) {
  const rows = await db.SavedItem.find({ userId, entityType, entityId: { $in: ids } })
    .select({ entityId: 1 })
    .lean();
  return new Set(rows.map((r) => String(r.entityId)));
}

/** All rows of one type, newest first — used by the migration and by the investor shortlist. */
export function idsOfType(db, userId, entityType) {
  return db.SavedItem.find({ userId, entityType }).sort({ savedAt: -1 }).select({ entityId: 1 }).lean();
}
