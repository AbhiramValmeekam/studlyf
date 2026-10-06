import { loadConfig } from '../config/index.js';
import { createDatabase } from './client.js';

const config = loadConfig();
const handle = await createDatabase(config.databaseUrl, { dbName: config.databaseName });
try {
  const ran = await handle.migrate();
  console.log(`Indexes synced; ${ran.length ? `applied migrations: ${ran.join(', ')}` : 'no pending data migrations'} (${handle.driver}).`);
} finally {
  await handle.close();
}
