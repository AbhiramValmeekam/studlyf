import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

/**
 * The frontend is served by this same process, so the SPA, /api and /media share one origin. These
 * tests pin the boundary between them: a miss under /api must stay JSON (a 200 HTML shell would be
 * parsed as a broken response by src/lib/api.js), while a client-side route must get the shell.
 */
let ctx;
let clientDir;

beforeAll(async () => {
  clientDir = mkdtempSync(path.join(tmpdir(), 'studlyf-shell-'));
  writeFileSync(
    path.join(clientDir, 'index.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/app-abc123.js"></script></body></html>',
  );
  mkdirSync(path.join(clientDir, 'assets'), { recursive: true });
  writeFileSync(path.join(clientDir, 'assets', 'app-abc123.js'), 'console.log(1)\n');
  ctx = await createTestContext({ CLIENT_DIR: clientDir });
});
afterAll(() => ctx.close());

describe('serving the built frontend alongside the API', () => {
  it('serves the shell at the root', async () => {
    const res = await request(ctx.app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<div id="root">');
  });

  it('serves the shell for a deep client-side route', async () => {
    const res = await request(ctx.app).get('/login');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<div id="root">');
  });

  it('never caches the shell, since its hashed bundle name changes per deploy', async () => {
    const res = await request(ctx.app).get('/');
    expect(res.headers['cache-control']).toMatch(/no-cache/);
  });

  it('caches hashed assets immutably', async () => {
    const res = await request(ctx.app).get('/assets/app-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/immutable/);
  });

  it('keeps unknown API routes JSON, never the shell', async () => {
    const res = await request(ctx.app).get('/api/v1/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('keeps the health probe JSON', async () => {
    const res = await request(ctx.app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('reports readiness against the database connection', async () => {
    const res = await request(ctx.app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe('connected');
  });
});

describe('security headers on the served app', () => {
  it('sends a CSP that permits the app and forbids inline script', async () => {
    const res = await request(ctx.app).get('/');
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeTruthy();
    // The theme bootstrap lives in an external file so this can stay 'self'.
    expect(csp).toMatch(/script-src 'self'/);
    expect(csp).toMatch(/object-src 'none'/);
  });

  it('does not force https upgrades outside production, which would break a local run', async () => {
    const res = await request(ctx.app).get('/');
    expect(res.headers['content-security-policy']).not.toMatch(/upgrade-insecure-requests/);
  });
});
