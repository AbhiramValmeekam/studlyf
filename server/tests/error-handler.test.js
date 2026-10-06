import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestContext } from './helpers.js';
import { errorHandler } from '../src/common/middleware/error-handler.js';
import { AppError } from '../src/common/errors/app-error.js';

/**
 * `express.static` runs with `fallthrough: false`, so a miss under /media reaches the error
 * handler as a plain Error carrying its real status. Before this was honoured those answered 500,
 * which hid a genuinely missing upload behind "Something went wrong".
 */
describe('error handler honours a middleware-raised status', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => ctx.close());

  it('answers 404 for a media file that does not exist', async () => {
    const res = await request(ctx.app).get('/media/definitely-not-here.png');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('answers 403 for a dotfile under /media', async () => {
    const res = await request(ctx.app).get('/media/.env');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('still answers 404 for an unknown API route, via notFoundHandler', async () => {
    const res = await request(ctx.app).get('/api/v1/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

/** The handler is the single translation point for every error — its contract is worth pinning. */
describe('error handler contract', () => {
  const call = (err) => {
    const res = {
      headersSent: false,
      statusCode: null,
      body: null,
      set() {
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    const next = vi.fn();
    errorHandler(err, {}, res, next);
    return { res, next };
  };

  it('maps err.status to the matching code without leaking the message', () => {
    const err = Object.assign(new Error("ENOENT: no such file or directory, open '/srv/uploads/x.png'"), { status: 404 });
    const { res } = call(err);
    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    // The path must not reach the client — this response is public.
    expect(res.body.error.message).not.toMatch(/ENOENT|\/srv/);
  });

  it('falls back to err.statusCode', () => {
    const { res } = call(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('refuses to let a 5xx relabel itself, and never treats a status message as a status', () => {
    for (const err of [
      Object.assign(new Error('boom'), { status: 500 }),
      Object.assign(new Error('boom'), { status: 'Not Found' }),
      new Error('boom'),
    ]) {
      const { res } = call(err);
      expect(res.statusCode).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body.error.message).toBe('Something went wrong');
    }
  });

  it('passes an AppError through untouched', () => {
    const { res } = call(new AppError('RATE_LIMITED', 'Too many attempts'));
    expect(res.statusCode).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('defers to Express once headers are already sent', () => {
    const res = { headersSent: true };
    const next = vi.fn();
    const err = new Error('read failed mid-stream');
    errorHandler(err, {}, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
