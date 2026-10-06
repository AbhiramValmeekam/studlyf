import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireSuperAdmin } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { ok, pageMeta } from '../../common/http/respond.js';
import { paginationQuery, parse, objectIdSchema } from '../../common/validation/index.js';
import { homepageAdminRouter } from '../homepage/homepage.routes.js';
import { applicationsAdminRouter } from '../applications/applications.routes.js';
import { projectsAdminRouter } from '../projects/projects.routes.js';
import { submissionsAdminRouter } from '../submissions/submissions.routes.js';
import { evaluationsAdminRouter } from '../evaluations/evaluations.routes.js';
import { achievementsAdminRouter } from '../achievements/achievements.routes.js';
import { coursesAdminRouter } from '../courses/courses.routes.js';
import { mediaAdminRouter } from '../media/media.routes.js';
import { mockAdminRouter } from '../mock/mock.routes.js';
import { opportunitiesAdminRouter } from '../opportunities/opportunities.routes.js';
import { partnersAdminRouter } from '../partners/partners.module.js';
import { pathsAdminRouter } from '../paths/paths.module.js';
import { projectBriefsAdminRouter } from '../project-briefs/project-briefs.routes.js';
import { resourcesAdminRouter } from '../resources/resources.routes.js';
import { roadmapsAdminRouter } from '../roadmaps/roadmaps.routes.js';
import { ottAdminRouter } from '../ott/ott.routes.js';
import { skillsAdminRouter } from '../skills/skills.routes.js';
import { statsAdminRouter } from '../stats/stats.module.js';
import { studhubAdminRouter } from '../studhub/studhub.routes.js';
import { taxonomyAdminRouter } from '../taxonomy/taxonomy.routes.js';
import { testimonialsAdminRouter } from '../testimonials/testimonials.module.js';
import { usersAdminRouter } from '../users/users.routes.js';
import { accessAdminRouter } from '../ecosystems/ecosystems.routes.js';

const auditQuery = z.object({
  entityType: z.string().trim().max(40).optional(),
  entityId: z.string().trim().max(80).optional(),
  actorUserId: objectIdSchema.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Everything under /api/v1/admin. Authorisation is enforced here, once, for the
 * whole tree — individual module routers never need to remember to check.
 *   EDITOR       → content management
 *   SUPER_ADMIN  → + users and audit logs
 */
export function adminRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use(noStore, requireAdmin(db));

  // Ecosystem verification (investors, HR, organizations). Reading the queue is any admin;
  // approving / rejecting / suspending access is SUPER_ADMIN only (checked inside).
  r.use(accessAdminRouter(deps));
  r.use('/homepage', homepageAdminRouter(deps));
  r.use('/path-cards', pathsAdminRouter(deps));
  r.use('/opportunities', opportunitiesAdminRouter(deps));
  r.use('/resources', resourcesAdminRouter(deps));
  r.use('/courses', coursesAdminRouter(deps));
  r.use('/studhub', studhubAdminRouter(deps));
  r.use('/mock-drills', mockAdminRouter(deps));
  r.use('/project-briefs', projectBriefsAdminRouter(deps));
  r.use('/roadmaps', roadmapsAdminRouter(deps));
  r.use('/ott', ottAdminRouter(deps));
  r.use('/stats', statsAdminRouter(deps));
  r.use('/testimonials', testimonialsAdminRouter(deps));
  r.use('/partners', partnersAdminRouter(deps));
  r.use('/media', mediaAdminRouter(deps));
  r.use('/skills', skillsAdminRouter(deps));
  // Phase 3 — projects (moderation), submissions, evaluations, achievements
  r.use('/projects', projectsAdminRouter(deps));
  r.use('/submissions', submissionsAdminRouter(deps));
  r.use('/achievements', achievementsAdminRouter(deps));
  r.use(evaluationsAdminRouter(deps)); // /evaluation-templates, /evaluators, /evaluations, /submissions/:id/evaluations
  r.use(applicationsAdminRouter(deps)); // /opportunities/:id/applications, /applications/:id, /applications/:id/status
  r.use('/', taxonomyAdminRouter(deps)); // /categories, /tags

  r.use('/users', requireSuperAdmin, usersAdminRouter(deps));
  r.get('/audit-logs', requireSuperAdmin, async (req, res) => {
    const q = parse(auditQuery, req.query);
    const filter = {};
    if (q.entityType) filter.entityType = q.entityType;
    if (q.entityId) filter.entityId = q.entityId;
    if (q.actorUserId) filter.actorUserId = q.actorUserId;
    const [rows, total] = await Promise.all([
      db.AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(),
      db.AuditLog.countDocuments(filter),
    ]);
    const items = rows.map(({ _id, actorUserId, ...rest }) => ({ id: String(_id), actorUserId: actorUserId ? String(actorUserId) : null, ...rest }));
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  return r;
}
