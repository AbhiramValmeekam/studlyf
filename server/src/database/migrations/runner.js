import { MIGRATIONS } from './index.js';

/**
 * MongoDB has no DDL, so "migrating" means two things:
 *  1. syncIndexes() for every model — creates missing indexes (incl. unique/TTL) and
 *     drops ones no longer declared in the schemas. Idempotent; safe on every deploy.
 *  2. Ordered data migrations from ./index.ts, each recorded in `_migrations` so it
 *     runs exactly once per database.
 */
export async function runMigrations(db) {
  const models = Object.entries(db).filter(([name]) => name !== 'connection');
  for (const [, model] of models) {
    await model.createCollection();
    await model.syncIndexes();
  }

  const ledger = db.connection.collection('_migrations');
  const applied = new Set((await ledger.find({}, { projection: { _id: 1 } }).toArray()).map((m) => m._id));
  const ran = [];
  for (const migration of [...MIGRATIONS].sort((a, b) => a.id.localeCompare(b.id))) {
    if (applied.has(migration.id)) continue;
    await migration.up(db);
    await ledger.insertOne({ _id: migration.id, appliedAt: new Date() });
    ran.push(migration.id);
  }
  return ran;
}
