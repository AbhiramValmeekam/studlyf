import { pino } from 'pino';
import { loadConfig } from './config/index.js';
import { createDatabase } from './database/client.js';
import { MemoryCache } from './common/cache/cache.js';
import { createMailer } from './common/mail/mailer.js';
import { createPrivateStorage, createStorage } from './common/storage/storage.js';

export function createLogger(config) {
  return pino({
    level: config.logLevel,
    ...(config.isProd || config.isTest
      ? {}
      : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }),
  });
}

export async function bootstrap(overrides = {}, env = process.env) {
  const config = overrides.config ?? loadConfig(env);
  const logger = overrides.logger ?? createLogger(config);
  const handle = await createDatabase(config.databaseUrl, { dbName: config.databaseName });
  const deps = {
    config,
    logger,
    db: handle.db,
    cache: overrides.cache ?? new MemoryCache(),
    mailer: overrides.mailer ?? createMailer(config, logger),
    storage: overrides.storage ?? createStorage(config),
    privateStorage: overrides.privateStorage ?? createPrivateStorage(config),
  };
  return { deps, handle };
}
