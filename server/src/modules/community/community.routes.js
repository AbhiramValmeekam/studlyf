import { Router } from 'express';
import { requireAuth, requireBuilder } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse, slugParams } from '../../common/validation/index.js';
import { z } from 'zod';
import * as service from './community.service.js';
import { createBody, feedQuery, updateBody } from './community.schemas.js';

const usernameParams = z.object({ username: z.string().trim().min(1).max(80) });

/** Authenticated community endpoints (feed, submit, upvote). Mounted alongside meRouter. */
export function communityRouter(deps) {
  const { db } = deps;
  const r = Router();
  const builder = requireBuilder(db);
  r.use('/community', noStore, requireAuth);

  r.get('/community/projects', async (req, res) => {
    const query = parse(feedQuery, req.query);
    const { items, total } = await service.listFeed(db, req.auth.user.id, query);
    ok(res, items, pageMeta(query.page, query.pageSize, total));
  });

  r.get('/community/tags', async (_req, res) => ok(res, await service.popularTags(db)));
  r.get('/community/categories', async (_req, res) => ok(res, await service.categoryCounts(db)));
  r.get('/community/leaderboard', async (_req, res) => ok(res, await service.leaderboard(db)));

  r.get('/community/my/projects', async (req, res) => ok(res, await service.listOwn(db, req.auth.user.id)));

  r.get('/community/authors/:username/projects', async (req, res) => {
    const { username } = parse(usernameParams, req.params);
    ok(res, await service.listByUsername(db, username));
  });

  r.get('/community/projects/:slug', async (req, res) => {
    const { slug } = parse(slugParams, req.params);
    ok(res, await service.getBySlug(db, req.auth.user.id, slug));
  });

  r.post('/community/projects', builder, async (req, res) => {
    const body = parse(createBody, req.body);
    created(res, await service.create(db, req.auth.user.id, body));
  });

  r.patch('/community/projects/:id', builder, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    ok(res, await service.update(db, req.auth.user.id, id, body));
  });

  r.delete('/community/projects/:id', builder, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.remove(db, req.auth.user.id, id));
  });

  r.post('/community/projects/:id/upvote', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.toggleUpvote(db, req.auth.user.id, id));
  });

  return r;
}
