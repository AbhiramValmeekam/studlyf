import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { bootstrap } from '../src/bootstrap.js';
import { DEV_CREDENTIALS, seedDevelopment } from '../src/database/seeds/dev-seed.js';

export const ORIGIN = 'http://localhost:5173';

/** Fresh embedded MongoDB (mongodb-memory-server), migrated and seeded, per test file. */
export async function createTestContext(env = {}) {
  const uploadDir = mkdtempSync(path.join(tmpdir(), 'studlyf-uploads-'));
  const privateUploadDir = mkdtempSync(path.join(tmpdir(), 'studlyf-private-'));
  // Empty, so serveClient() finds no index.html and stays out of the way: these are API tests and
  // must not start answering unknown paths with the SPA shell just because a dist/ happens to sit
  // beside the server. A test that exercises the shell passes its own CLIENT_DIR.
  const clientDir = mkdtempSync(path.join(tmpdir(), 'studlyf-client-'));
  const { deps, handle } = await bootstrap({}, {
    NODE_ENV: 'test',
    MONGODB_URI: 'embedded:memory',
    APP_URL: ORIGIN,
    RATE_LIMIT_ENABLED: 'false',
    UPLOAD_DIR: uploadDir,
    PRIVATE_UPLOAD_DIR: privateUploadDir,
    CLIENT_DIR: clientDir,
    ...env,
  });
  await handle.migrate();
  await seedDevelopment(deps.db, { passwordHashCost: deps.config.auth.passwordHashCost, assetBaseUrl: ORIGIN });
  const app = createApp(deps);

  return {
    app,
    deps,
    mailer: deps.mailer,
    async close() {
      await handle.close();
      rmSync(uploadDir, { recursive: true, force: true });
      rmSync(privateUploadDir, { recursive: true, force: true });
      rmSync(clientDir, { recursive: true, force: true });
    },
    async loginAs(who) {
      const agent = request.agent(app);
      const res = await agent.post('/api/v1/auth/login').send(DEV_CREDENTIALS[who]);
      if (res.status !== 200) throw new Error(`login as ${who} failed: ${res.status} ${JSON.stringify(res.body)}`);
      return agent;
    },
  };
}

/** Pull the token out of the last email sent to an address. */
export function tokenFromMail(mailer, to) {
  const mail = mailer.lastTo(to);
  const match = mail?.text.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`no token email for ${to}`);
  return decodeURIComponent(match[1]);
}

let counter = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}.${Date.now()}.${counter++}@example.com`;
