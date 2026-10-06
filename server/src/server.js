import { createApp } from './app.js';
import { bootstrap } from './bootstrap.js';

const { deps, handle } = await bootstrap();
const { config, logger } = deps;

// The embedded dev database is migrated on boot for convenience. Against a real
// MongoDB/Atlas deployment, migrations are an explicit deploy step: `npm run db:migrate`.
if (handle.driver === 'embedded') await handle.migrate();

const server = createApp(deps).listen(config.port, () => {
  logger.info(
    `STUDLYF listening on http://localhost:${config.port} (${config.env}, db=${handle.driver}, client=${config.clientDir})`,
  );
});

let shuttingDown = false;

/**
 * Drain, close the database, exit. Idempotent: SIGTERM from the orchestrator and SIGINT from a
 * developer's Ctrl-C can both arrive in the same window, and running this twice would stack
 * timers and double-close the database.
 */
async function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'shutting down');

  const forced = setTimeout(() => {
    logger.warn('shutdown timed out after 10s; forcing exit');
    process.exit(1);
  }, 10_000);
  forced.unref();

  server.close(async () => {
    try {
      await handle.close();
      clearTimeout(forced);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'failed to close the database cleanly');
      process.exit(1);
    }
  });

  // Keep-alive sockets that are idle would otherwise hold `close()` open until the forced exit,
  // turning every rolling deploy into a 10-second stall that still exits non-zero.
  server.closeIdleConnections();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// Node terminates on a rejected promise nobody awaited. Without a handler that is a silent death:
// no log line, and the database never gets closed.
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'unhandled promise rejection');
});

// An uncaught exception leaves the runtime in an undefined state, so drain and exit rather than
// keep serving traffic from it.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  void shutdown('uncaughtException');
});
