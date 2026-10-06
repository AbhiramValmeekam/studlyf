import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../common/http/respond.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { parse } from '../../common/validation/index.js';
import * as service from './certificates.service.js';

const codeParams = z.object({ code: z.string().trim().min(1).max(64) });

/**
 * Public certificate verification (spec §18/§68). Unauthenticated by design — a credential you
 * can't check without an account isn't verifiable. `noStore` because a revocation has to take
 * effect at once, and a tight limiter because enumerating codes is the obvious abuse.
 */
export function certificatesPublicRouter({ db, config }) {
  const r = Router();
  const reads = limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 30 });

  r.get('/certificates/verify/:code', reads, noStore, async (req, res) => {
    const { code } = parse(codeParams, req.params);
    ok(res, await service.verify(db, code));
  });

  return r;
}
