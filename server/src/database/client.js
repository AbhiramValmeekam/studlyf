import path from 'node:path';
import { mkdirSync } from 'node:fs';
import mongoose from 'mongoose';
import { createModels } from './schema/index.js';
import { runMigrations } from './migrations/runner.js';

/**
 * `mongodb://…` / `mongodb+srv://…` → a real MongoDB server or Atlas (production).
 * `embedded:memory`                 → throwaway mongod started in-process (tests).
 * `embedded:<dir>`                  → mongod persisting to <dir> (local dev without installing MongoDB).
 *
 * The embedded server comes from `mongodb-memory-server` (a dev dependency) and is
 * refused in production by config validation.
 */
export async function createDatabase(url, opts = {}) {
  let uri = url;
  let stopEmbedded;
  let driver = 'mongodb';

  if (url.startsWith('embedded:')) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const target = url.slice('embedded:'.length);
    let dbPath;
    if (target && target !== 'memory') {
      dbPath = path.resolve(process.cwd(), target);
      mkdirSync(dbPath, { recursive: true });
    }
    const server = await MongoMemoryServer.create({
      instance: dbPath ? { dbPath, storageEngine: 'wiredTiger' } : {},
    });
    uri = server.getUri();
    stopEmbedded = () => server.stop({ doCleanup: !dbPath, force: false });
    driver = 'embedded';
  } else if (!/^mongodb(\+srv)?:\/\//.test(url)) {
    throw new Error(`Unsupported database URL scheme: ${url.split(':')[0]}`);
  }

  const connection = await mongoose
    .createConnection(uri, {
      dbName: opts.dbName ?? (driver === 'embedded' ? 'studlyf' : undefined),
      autoIndex: false, // indexes are built by `migrate()`, never implicitly at runtime
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    })
    .asPromise();
  const db = createModels(connection);

  return {
    db,
    driver,
    migrate: () => runMigrations(db),
    async close() {
      await connection.close();
      await stopEmbedded?.();
    },
  };
}
