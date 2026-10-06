import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { writeAudit } from '../../common/utilities/admin-change.js';
import { createNotification } from '../notifications/notifications.service.js';
import { issueForAchievement } from '../certificates/certificates.service.js';
import { isLinkViewable } from '../projects/access.js';

// ---- issuing (SYSTEM) ---------------------------------------------------------

/**
 * Issue a platform-verified achievement. Idempotent: the (userId, sourceKey) partial unique index
 * turns a repeated event into a no-op (returns null), so retries and re-transitions never award
 * twice or re-notify.
 */
export async function issueSystemAchievement(db, spec) {
  const { userId, sourceKey } = spec;
  if (!sourceKey) throw new Error('System achievements need a sourceKey');
  let doc;
  try {
    doc = await db.Achievement.create({
      userId,
      projectId: spec.projectId ?? null,
      opportunityId: spec.opportunityId ?? null,
      submissionId: spec.submissionId ?? null,
      title: spec.title,
      description: spec.description ?? null,
      type: spec.type,
      issuer: spec.issuer ?? 'STUDLYF',
      date: spec.date ?? new Date(),
      source: 'SYSTEM',
      verificationStatus: 'VERIFIED',
      visibility: 'PUBLIC',
      metadata: spec.metadata ?? {},
      sourceKey,
      verifiedAt: new Date(),
    });
  } catch (err) {
    if (err?.code === 11000) return null;
    throw err;
  }
  await writeAudit(db, {
    actorUserId: spec.actorUserId ?? null,
    action: 'achievement.create',
    entityType: 'achievement',
    entityId: doc._id,
    changes: { userId: String(userId), type: spec.type, source: 'SYSTEM', sourceKey },
  });
  await createNotification(db, {
    userId,
    type: 'ACHIEVEMENT',
    title: `Achievement unlocked: ${spec.title}`,
    body: spec.description ?? null,
    data: { achievementId: String(doc._id), projectId: idOf(spec.projectId), opportunityId: idOf(spec.opportunityId) },
    dedupeKey: `ACHIEVEMENT:${doc._id}`,
  });
  // Milestones that are results also mint a verifiable certificate (spec §18). A credential must
  // never fail the result it belongs to, and issuance is idempotent, so a failure here is
  // recoverable by re-running the backfill in `migrations/` rather than by blocking the award.
  try {
    await issueForAchievement(db, {
      achievementId: doc._id,
      userId,
      type: doc.type,
      title: doc.title,
      date: doc.date,
      opportunityId: idOf(doc.opportunityId),
    });
  } catch {
    /* backfilled later */
  }
  return doc;
}

/** Everyone who built the project (active members except mentors) earns team achievements. */
export async function teamBuilderIds(db, projectId) {
  const members = await db.ProjectMember.find({ projectId, status: 'ACTIVE', role: { $ne: 'MENTOR' } })
    .select({ userId: 1 })
    .lean();
  return members.map((m) => m.userId);
}

export async function issueToTeam(db, projectId, spec) {
  const userIds = await teamBuilderIds(db, projectId);
  for (const userId of userIds) {
    await issueSystemAchievement(db, { ...spec, userId, projectId });
  }
}

/** "Project completed" — once the work is declared complete AND the project has been published. */
export async function issueProjectCompleted(db, project) {
  if (!project.completedAt || !project.publishedAt) return;
  await issueToTeam(db, project._id, {
    type: 'PROJECT_COMPLETED',
    title: `Completed ${project.title}`,
    description: 'Shipped a complete, published project on STUDLYF.',
    date: project.completedAt,
    sourceKey: `PROJECT_COMPLETED:${project._id}`,
  });
}

// ---- serializers ------------------------------------------------------------------

async function loadRefs(db, rows) {
  const projectIds = [...new Set(rows.map((r) => idOf(r.projectId)).filter(Boolean))];
  const oppIds = [...new Set(rows.map((r) => idOf(r.opportunityId)).filter(Boolean))];
  const [projects, opps] = await Promise.all([
    projectIds.length
      ? db.Project.find({ _id: { $in: projectIds } })
          .select({ title: 1, slug: 1, visibility: 1, publishedAt: 1, moderationStatus: 1, status: 1 })
          .lean()
      : [],
    oppIds.length ? db.Opportunity.find({ _id: { $in: oppIds } }).select({ title: 1, slug: 1, type: 1 }).lean() : [],
  ]);
  return { projectMap: new Map(projects.map((p) => [String(p._id), p])), oppMap: new Map(opps.map((o) => [String(o._id), o])) };
}

/**
 * `audience`: 'owner' shows everything the user may manage; 'public' hides private achievements
 * and never links a project the viewer isn't allowed to see.
 */
function toView(a, refs, audience) {
  const project = refs.projectMap.get(idOf(a.projectId));
  const opp = refs.oppMap.get(idOf(a.opportunityId));
  const showProject = project && (audience !== 'public' || isLinkViewable(project));
  return {
    id: String(a._id),
    title: a.title,
    description: a.description ?? null,
    type: a.type,
    issuer: a.issuer ?? null,
    date: a.date,
    source: a.source,
    verificationStatus: a.verificationStatus,
    verified: a.verificationStatus === 'VERIFIED',
    project: showProject ? { id: String(project._id), slug: project.slug, title: project.title } : null,
    opportunity: opp ? { id: String(opp._id), slug: opp.slug, title: opp.title, type: opp.type } : null,
    url: typeof a.metadata?.url === 'string' ? a.metadata.url : null,
    ...(audience !== 'public'
      ? { visibility: a.visibility, editable: a.source === 'USER', createdAt: a.createdAt }
      : {}),
  };
}

export async function serialize(db, rows, audience) {
  const refs = await loadRefs(db, rows);
  return rows.map((r) => toView(r, refs, audience));
}

// ---- builder (USER) ------------------------------------------------------------

export async function listMine(db, userId, { page, pageSize }) {
  const filter = { userId };
  const [rows, total] = await Promise.all([
    db.Achievement.find(filter).sort({ date: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Achievement.countDocuments(filter),
  ]);
  return { items: await serialize(db, rows, 'owner'), total };
}

async function assertOwnProjectLink(db, userId, projectId) {
  if (!projectId) return;
  const member = await db.ProjectMember.exists({ projectId, userId, status: 'ACTIVE' });
  if (!member) throw AppError.validation([{ field: 'projectId', message: 'You can only link projects you are part of' }]);
}

/** User-added achievements are always UNVERIFIED and sourced USER — the client cannot say otherwise. */
export async function createForUser(db, userId, input) {
  await assertOwnProjectLink(db, userId, input.projectId);
  const doc = await db.Achievement.create({
    userId,
    projectId: input.projectId ?? null,
    opportunityId: null,
    title: input.title,
    description: input.description ?? null,
    type: input.type,
    issuer: input.issuer ?? null,
    date: input.date ?? new Date(),
    source: 'USER',
    verificationStatus: 'UNVERIFIED',
    visibility: input.visibility ?? 'PUBLIC',
    metadata: input.url ? { url: input.url } : {},
  });
  return (await serialize(db, [doc.toObject()], 'owner'))[0];
}

async function ownOr404(db, userId, id) {
  const row = await db.Achievement.findOne({ _id: id, userId }).lean();
  if (!row) throw AppError.notFound('Achievement');
  return row;
}

/**
 * Builders can edit their own USER achievements (which resets verification if an admin had
 * verified it), and can only change the visibility of SYSTEM ones.
 */
export async function updateForUser(db, userId, id, patch) {
  const row = await ownOr404(db, userId, id);
  const set = {};
  if (row.source === 'SYSTEM') {
    const keys = Object.keys(patch).filter((k) => k !== 'visibility');
    if (keys.length) throw AppError.forbidden('Platform-issued achievements can only be shown or hidden.');
  } else {
    await assertOwnProjectLink(db, userId, patch.projectId);
    for (const k of ['title', 'description', 'type', 'issuer', 'date', 'projectId']) {
      if (patch[k] !== undefined) set[k] = patch[k];
    }
    if (patch.url !== undefined) set.metadata = patch.url ? { ...(row.metadata ?? {}), url: patch.url } : {};
    const contentChanged = Object.keys(set).length > 0;
    if (contentChanged && row.verificationStatus !== 'UNVERIFIED') {
      set.verificationStatus = 'UNVERIFIED'; // edited evidence must be re-verified
      set.verifiedBy = null;
      set.verifiedAt = null;
    }
  }
  if (patch.visibility !== undefined) set.visibility = patch.visibility;
  if (Object.keys(set).length) await db.Achievement.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return (await serialize(db, [await db.Achievement.findById(id).lean()], 'owner'))[0];
}

export async function removeForUser(db, userId, id) {
  const row = await ownOr404(db, userId, id);
  if (row.source === 'SYSTEM') {
    throw AppError.forbidden('Platform-issued achievements can’t be deleted — hide them instead.');
  }
  await db.Achievement.deleteOne({ _id: id });
  return { id };
}

// ---- public -------------------------------------------------------------------------

/** Public achievements of a builder, by username. Private builder profiles are not listed. */
export async function listPublicByUsername(db, username, { page, pageSize }) {
  const profile = await db.BuilderProfile.findOne({ username, visibility: 'PUBLIC' }).select({ userId: 1 }).lean();
  if (!profile) throw AppError.notFound('Builder profile');
  const filter = { userId: profile.userId, visibility: 'PUBLIC', verificationStatus: { $ne: 'REJECTED' } };
  const [rows, total] = await Promise.all([
    db.Achievement.find(filter).sort({ date: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Achievement.countDocuments(filter),
  ]);
  return { items: await serialize(db, rows, 'public'), total };
}

/** Achievements earned through one project, shown once per type+opportunity on the project page. */
export async function forProject(db, projectId) {
  const rows = await db.Achievement.find({ projectId, source: 'SYSTEM', visibility: 'PUBLIC', verificationStatus: 'VERIFIED' })
    .sort({ date: -1 })
    .lean();
  const seen = new Set();
  const distinct = rows.filter((r) => {
    const key = `${r.type}:${idOf(r.opportunityId) ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (await serialize(db, distinct, 'public')).map(({ project: _p, ...rest }) => rest);
}

// ---- admin ------------------------------------------------------------------------------

export async function listAdmin(db, { source, verificationStatus, type, userId, page, pageSize }) {
  const filter = {};
  if (source) filter.source = source;
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (type) filter.type = type;
  if (userId) filter.userId = userId;
  const [rows, total] = await Promise.all([
    db.Achievement.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Achievement.countDocuments(filter),
  ]);
  const items = await serialize(db, rows, 'owner');
  const users = await db.User.find({ _id: { $in: [...new Set(rows.map((r) => String(r.userId)))] } })
    .select({ name: 1, email: 1 })
    .lean();
  const profiles = await db.BuilderProfile.find({ userId: { $in: users.map((u) => u._id) } }).select({ userId: 1, username: 1 }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const unameMap = new Map(profiles.map((p) => [String(p.userId), p.username]));
  return {
    items: items.map((it, i) => {
      const uid = String(rows[i].userId);
      return { ...it, user: { id: uid, name: userMap.get(uid)?.name ?? null, email: userMap.get(uid)?.email ?? null, username: unameMap.get(uid) ?? null } };
    }),
    total,
  };
}

export async function adminSetVerification(db, adminId, id, verificationStatus) {
  const row = await db.Achievement.findById(id).lean();
  if (!row) throw AppError.notFound('Achievement');
  await db.Achievement.updateOne(
    { _id: id },
    {
      $set: {
        verificationStatus,
        verifiedBy: verificationStatus === 'UNVERIFIED' ? null : adminId,
        verifiedAt: verificationStatus === 'UNVERIFIED' ? null : new Date(),
      },
    },
  );
  return (await serialize(db, [await db.Achievement.findById(id).lean()], 'owner'))[0];
}

/** An admin award (e.g. FINALIST/WINNER). Platform-issued, so it is SYSTEM + VERIFIED. */
export async function adminAward(db, adminId, input) {
  const user = await db.User.exists({ _id: input.userId });
  if (!user) throw AppError.validation([{ field: 'userId', message: 'Unknown user' }]);
  const doc = await issueSystemAchievement(db, {
    ...input,
    issuer: input.issuer ?? 'STUDLYF',
    sourceKey: `ADMIN_AWARD:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    actorUserId: adminId,
  });
  await db.Achievement.updateOne({ _id: doc._id }, { $set: { verifiedBy: adminId } });
  return (await serialize(db, [await db.Achievement.findById(doc._id).lean()], 'owner'))[0];
}

export async function adminRemove(db, id) {
  const row = await db.Achievement.findByIdAndDelete(id).lean();
  if (!row) throw AppError.notFound('Achievement');
  return { id, title: row.title };
}
