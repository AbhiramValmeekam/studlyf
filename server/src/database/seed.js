import { loadConfig } from '../config/index.js';
import { createDatabase } from './client.js';
import { DEV_CREDENTIALS, seedDevelopment, truncateAll } from './seeds/dev-seed.js';

const config = loadConfig();
if (config.isProd) {
  console.error('Refusing to seed: development seed data must never be loaded in production.');
  process.exit(1);
}

const handle = await createDatabase(config.databaseUrl, { dbName: config.databaseName });
try {
  await handle.migrate();
  if (process.argv.includes('--reset')) {
    await truncateAll(handle.db);
    console.log('All collections emptied.');
  }
  const result = await seedDevelopment(handle.db, {
    passwordHashCost: config.auth.passwordHashCost,
    assetBaseUrl: config.appUrl,
  });
  if (result.skipped) {
    console.log('Database already has users — seed skipped. Use `npm run db:reset` to wipe and reseed.');
  } else {
    console.log('Development data seeded.\n\nDEV-ONLY credentials (do not use outside local development):');
    for (const [role, c] of Object.entries(DEV_CREDENTIALS)) console.log(`  ${role.padEnd(11)} ${c.email}  /  ${c.password}`);
  }
} finally {
  await handle.close();
}
