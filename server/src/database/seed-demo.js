/**
 * Runner for the additive demo seed. Safe to run repeatedly and safe to run against a
 * database that already has real accounts — it only ever inserts what is missing.
 *
 *   npm run db:seed:demo
 *
 * The API server must be stopped first: the dev database runs on an embedded MongoDB whose
 * WiredTiger data directory can only be opened by one process at a time.
 */
import { loadConfig } from '../config/index.js';
import { createDatabase } from './client.js';
import { DEMO_ACCOUNTS, seedDemo } from './seeds/demo-seed.js';

const config = loadConfig();
if (config.isProd) {
  console.error('Refusing to seed: demo data must never be loaded in production.');
  process.exit(1);
}

const handle = await createDatabase(config.databaseUrl, { dbName: config.databaseName });
try {
  await handle.migrate();
  const result = await seedDemo(handle.db, {
    passwordHashCost: config.auth.passwordHashCost,
  });

  console.log('Demo data applied (additive — nothing was deleted or overwritten).\n');
  console.log('Rows ensured per collection:');
  for (const [name, n] of Object.entries(result.summary)) {
    console.log(`  ${String(n).padStart(4)}  ${name}`);
  }
  console.log('\nDemo-only credentials (local development only):');
  for (const [role, c] of Object.entries(DEMO_ACCOUNTS)) {
    console.log(`  ${role.padEnd(11)} ${c.email}  /  ${c.password}`);
  }
  console.log('\nBuilder accounts already in the database were enriched in place.');
} catch (error) {
  console.error('\nDemo seed failed:', error.message);
  if (error.errors) {
    for (const [field, e] of Object.entries(error.errors)) console.error(`  ${field}: ${e.message}`);
  }
  process.exitCode = 1;
} finally {
  await handle.close();
}
