import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireBuilder } from '../../common/auth/middleware.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse } from '../../common/validation/index.js';
import { recordAdminChange, recordAudit } from '../../common/utilities/admin-change.js';
import { z } from 'zod';
import * as projects from './projects.service.js';
import * as team from './team.service.js';
import * as media from './media.service.js';
import * as moderation from './moderation.service.js';
import {
  adminListQuery,
  createBody,
  discoverQuery,
  featuredBody,
  idOrSlugParams,
  mediaUploadFields,
  memberParams,
  moderateBody,
  myProjectsQuery,
  publishBody,
  reportBody,
  teamInviteBody,
  teamUpdateBody,
  updateBody,
} from './projects.schemas.js';

const usernameParams = z.object({ username: z.string().trim().toLowerCase().min(1).max(40) });
const assetParams = z.object({ assetId: z.string().regex(/^[a-f0-9]{24}$/i, 'Must be a valid id') });

/**
 * Phase 3 project API (mounted at /api/v1, before the public-content group).
 * Reads that can be public (discovery, a project page, a team) accept an optional session;
 * everything else requires one. Permission checks live in access.js — never in the client.
 */
export function projectsRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  const on = config.rateLimit.enabled;
  const HOUR = 60 * 60 * 1000;
  const builder = requireBuilder(db);
  const viewer = (req) => req.auth?.user.id ?? null;

  r.use(['/projects', '/project-media', '/builders/:username/projects', '/builder/profile/featured-projects'], noStore);

  // ---- collection routes (registered before /projects/:id) ----------------------------
  r.get('/projects/discover', async (req, res) => {
    const q = parse(discoverQuery, req.query);
    const { items, total } = await projects.discover(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/projects/invitations', requireAuth, async (req, res) => {
    ok(res, await projects.listInvitations(db, req.auth.user.id));
  });

  r.get('/projects', requireAuth, async (req, res) => {
    const q = parse(myProjectsQuery, req.query);
    const { items, total } = await projects.listMine(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.post('/projects', requireAuth, builder, limiter(on, { windowMs: HOUR, limit: 60 }), async (req, res) => {
    const body = parse(createBody, req.body);
    const { project, detail } = await projects.create(deps, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'project.create', entityType: 'project', entityId: String(project._id), changes: { title: body.title } });
    created(res, detail);
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.storage.maxUploadBytes, files: 1, fields: 5 } });
  r.post('/projects/media', requireAuth, builder, limiter(on, { windowMs: HOUR, limit: 60 }), upload.single('file'), async (req, res) => {
    const { purpose } = parse(mediaUploadFields, req.body ?? {});
    const asset = await media.upload(deps, req.auth.user.id, req.file, purpose);
    await recordAudit(deps, req, { action: 'project.media.upload', entityType: 'media', entityId: asset.id, changes: { purpose, size: asset.sizeBytes } });
    created(res, asset);
  });

  // ---- single project ---------------------------------------------------------------------
  r.get('/projects/:id', async (req, res) => {
    const { id } = parse(idOrSlugParams, req.params);
    ok(res, await projects.getProject(deps, id, viewer(req)));
  });

  r.patch('/projects/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const { detail, changes } = await projects.update(deps, req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'project.update', entityType: 'project', entityId: id, changes: { fields: changes } });
    ok(res, detail);
  });

  r.delete('/projects/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await projects.remove(deps, req.auth.user.id, id);
    await recordAudit(deps, req, { action: 'project.delete', entityType: 'project', entityId: id, changes: removed });
    ok(res, { id });
  });

  r.post('/projects/:id/publish', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { visibility } = parse(publishBody, req.body ?? {});
    const { detail } = await projects.publish(deps, req.auth.user.id, id, { visibility });
    await recordAudit(deps, req, { action: 'project.publish', entityType: 'project', entityId: id, changes: { visibility } });
    ok(res, detail);
  });

  r.post('/projects/:id/archive', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { detail } = await projects.archive(deps, req.auth.user.id, id);
    await recordAudit(deps, req, { action: 'project.archive', entityType: 'project', entityId: id });
    ok(res, detail);
  });

  r.post('/projects/:id/duplicate', requireAuth, builder, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { project, detail } = await projects.duplicate(deps, req.auth.user.id, id);
    await recordAudit(deps, req, { action: 'project.duplicate', entityType: 'project', entityId: String(project._id), changes: { from: id } });
    created(res, detail);
  });

  r.post('/projects/:id/report', requireAuth, limiter(on, { windowMs: HOUR, limit: 10 }), async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(reportBody, req.body);
    await moderation.report(db, req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'project.report', entityType: 'project', entityId: id, changes: { reason: body.reason } });
    created(res, { reported: true });
  });

  // ---- team -------------------------------------------------------------------------------
  r.get('/projects/:id/team', async (req, res) => {
    const { id } = parse(idOrSlugParams, req.params);
    ok(res, await team.listTeam(db, id, viewer(req)));
  });

  r.post('/projects/:id/team', requireAuth, limiter(on, { windowMs: HOUR, limit: 60 }), async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(teamInviteBody, req.body);
    const { member } = await team.invite(db, req.auth.user.id, id, body);
    await recordAudit(deps, req, {
      action: 'project.team.add',
      entityType: 'project',
      entityId: id,
      changes: { memberId: String(member._id), userId: String(member.userId), role: member.role },
    });
    created(res, await team.listTeam(db, id, req.auth.user.id));
  });

  r.patch('/projects/:id/team/:memberId', requireAuth, async (req, res) => {
    const { id, memberId } = parse(memberParams, req.params);
    const body = parse(teamUpdateBody, req.body);
    const { action } = await team.updateMember(db, req.auth.user.id, id, memberId, body);
    await recordAudit(deps, req, {
      action: action === 'accept' ? 'project.team.accept' : 'project.team.update',
      entityType: 'project',
      entityId: id,
      changes: { memberId, ...body },
    });
    ok(res, await team.listTeam(db, id, req.auth.user.id));
  });

  r.delete('/projects/:id/team/:memberId', requireAuth, async (req, res) => {
    const { id, memberId } = parse(memberParams, req.params);
    const { action, member } = await team.removeMember(db, req.auth.user.id, id, memberId);
    await recordAudit(deps, req, {
      action: 'project.team.remove',
      entityType: 'project',
      entityId: id,
      changes: { memberId, userId: String(member.userId), by: action },
    });
    ok(res, { removed: memberId });
  });

  // ---- private documents ----------------------------------------------------------------
  r.get('/project-media/:assetId', async (req, res) => {
    const { assetId } = parse(assetParams, req.params);
    const file = await media.authorizeDownload(deps, viewer(req), assetId);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.sendFile(file.path);
  });

  // ---- builder profile: portfolio + featured -------------------------------------------------
  r.get('/builders/:username/projects', async (req, res) => {
    const { username } = parse(usernameParams, req.params);
    ok(res, await projects.publicPortfolio(db, username));
  });

  r.put('/builder/profile/featured-projects', requireAuth, builder, async (req, res) => {
    const { projectIds } = parse(featuredBody, req.body);
    const result = await projects.setFeatured(deps, req.auth.user.id, projectIds);
    await recordAudit(deps, req, { action: 'builder.featured_projects', entityType: 'builder_profile', entityId: req.auth.user.id, changes: { projectIds } });
    ok(res, result);
  });

  return r;
}

/** Admin project management + moderation — mounted at /admin/projects (replaces the Phase 2 community router). */
export function projectsAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  const entityType = 'project';

  r.get('/', async (req, res) => {
    const q = parse(adminListQuery, req.query);
    const { items, total } = await moderation.listAdmin(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await moderation.getAdmin(db, id));
  });

  r.post('/:id/moderate', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(moderateBody, req.body);
    const item = await moderation.moderate(db, req.auth.user.id, id, body);
    await recordAdminChange(deps, req, { action: `${entityType}.moderate`, entityType, entityId: id, changes: body });
    ok(res, item);
  });

  r.post('/:id/publish', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const item = await moderation.adminPublish(db, id);
    await recordAdminChange(deps, req, { action: `${entityType}.publish`, entityType, entityId: id });
    ok(res, item);
  });

  r.post('/:id/archive', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const item = await moderation.adminArchive(db, id);
    await recordAdminChange(deps, req, { action: `${entityType}.archive`, entityType, entityId: id });
    ok(res, item);
  });

  for (const [verb, featured] of [['feature', true], ['unfeature', false]]) {
    r.post(`/:id/${verb}`, async (req, res) => {
      const { id } = parse(idParams, req.params);
      const item = await moderation.adminSetFeatured(db, id, featured);
      await recordAdminChange(deps, req, { action: `${entityType}.${verb}`, entityType, entityId: id });
      ok(res, item);
    });
  }

  r.delete('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await moderation.adminRemove(db, id);
    await recordAdminChange(deps, req, { action: `${entityType}.delete`, entityType, entityId: id, changes: removed });
    ok(res, { id });
  });

  return r;
}
