import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { loadMedia, pick } from '../../common/utilities/media.js';
import { escapeRegex, prefixSearchFilter } from '../../common/utilities/text.js';
import { HIRING_STAGES } from '../../database/schema/index.js';
import { createNotification } from '../notifications/notifications.service.js';
import { resubmission } from '../ecosystems/access.service.js';
import { discoverableFilter } from '../projects/access.js';
import { linksOut } from '../profile/profile.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// ---- verification request -------------------------------------------------------

const requestView = (p) =>
  p
    ? {
        id: String(p._id),
        status: p.status,
        statusNote: p.statusNote ?? null,
        submittedAt: p.submittedAt,
        reviewedAt: p.reviewedAt ?? null,
        companyName: p.companyName,
        designation: p.designation,
        workEmail: p.workEmail,
        companyWebsite: p.companyWebsite ?? null,
        linkedin: p.linkedin ?? null,
        companySize: p.companySize ?? null,
        hiringFor: p.hiringFor ?? null,
      }
    : null;

export async function getRequest(db, userId) {
  return requestView(await db.HrProfile.findOne({ userId }).lean());
}

export async function submitRequest(db, userId, input) {
  const existing = await db.HrProfile.findOne({ userId }).lean();
  const statusFields = resubmission(existing);
  if (existing) {
    await db.HrProfile.updateOne({ _id: existing._id }, { $set: { ...input, ...statusFields } }, { runValidators: true });
  } else {
    try {
      await db.HrProfile.create({ userId, ...input, ...statusFields });
    } catch (err) {
      if (err?.code === 11000) throw new AppError('CONFLICT', 'You already have an HR verification request.');
      throw err;
    }
  }
  return { request: await getRequest(db, userId), created: !existing };
}

// ---- talent discovery ------------------------------------------------------------

/**
 * Evidence per builder, batched for a page: discoverable projects they're on, public achievements
 * (verified count separately) and completed evaluations marked PUBLIC. No composite score.
 */
async function evidenceFor(db, userIds) {
  if (!userIds.length) return new Map();
  const members = await db.ProjectMember.find({ userId: { $in: userIds }, status: 'ACTIVE' }).select({ userId: 1, projectId: 1 }).lean();
  const visibleProjects = await db.Project.find({ _id: { $in: members.map((m) => m.projectId) }, ...discoverableFilter() }).select({ _id: 1 }).lean();
  const visible = new Set(visibleProjects.map((p) => String(p._id)));
  const [achievements, evaluations] = await Promise.all([
    db.Achievement.aggregate([
      { $match: { userId: { $in: userIds.map(oid) }, visibility: 'PUBLIC', verificationStatus: { $ne: 'REJECTED' } } },
      { $group: { _id: '$userId', n: { $sum: 1 }, verified: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'VERIFIED'] }, 1, 0] } } } },
    ]),
    db.Evaluation.find({ projectId: { $in: [...visible].map(oid) }, status: 'COMPLETED', scoreVisibility: 'PUBLIC' }).select({ projectId: 1 }).lean(),
  ]);
  const evalByProject = new Map();
  for (const e of evaluations) evalByProject.set(String(e.projectId), (evalByProject.get(String(e.projectId)) ?? 0) + 1);
  const out = new Map(userIds.map((u) => [String(u), { projects: 0, achievements: 0, verifiedAchievements: 0, publicEvaluations: 0 }]));
  for (const m of members) {
    if (!visible.has(String(m.projectId))) continue;
    const e = out.get(String(m.userId));
    e.projects += 1;
    e.publicEvaluations += evalByProject.get(String(m.projectId)) ?? 0;
  }
  for (const a of achievements) Object.assign(out.get(String(a._id)), { achievements: a.n, verifiedAchievements: a.verified });
  return out;
}

async function buildersView(db, rows, hrUserId) {
  const userIds = rows.map((r) => r.userId);
  const [users, evidence, pipeline] = await Promise.all([
    db.User.find({ _id: { $in: userIds }, status: 'ACTIVE' }).select({ name: 1, profilePhotoId: 1, profile: 1 }).lean(),
    evidenceFor(db, userIds),
    db.HrCandidate.find({ hrUserId, builderProfileId: { $in: rows.map((r) => r._id) } }).select({ builderProfileId: 1, stage: 1 }).lean(),
  ]);
  const media = await loadMedia(db, users.map((u) => u.profilePhotoId));
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const stageOf = new Map(pipeline.map((c) => [String(c.builderProfileId), { id: String(c._id), stage: c.stage }]));
  return rows
    .filter((r) => userMap.has(String(r.userId)))
    .map((r) => {
      const u = userMap.get(String(r.userId));
      return {
        builderProfileId: String(r._id),
        username: r.username,
        name: u.name,
        photo: pick(media, u.profilePhotoId),
        headline: r.headline ?? null,
        availability: r.availability ?? null,
        location: u.profile?.city ?? null,
        college: u.profile?.college ?? null,
        links: linksOut(u.profile?.links),
        skills: (r.skills ?? []).map((s) => ({ slug: s.slug, name: s.name, proficiency: s.proficiency })),
        evidence: evidence.get(String(r.userId)),
        pipeline: stageOf.get(String(r._id)) ?? null,
      };
    });
}

/** Only PUBLIC builder profiles are ever searchable by HR. */
export async function searchTalent(db, hrUserId, { q, skill, availability, college, location, page, pageSize }) {
  const match = { visibility: 'PUBLIC', ...(prefixSearchFilter(q) ?? {}) };
  if (skill) match['skills.slug'] = skill;
  if (availability) match.availability = availability;
  if (college || location) {
    // College and city live on the personal profile (users.profile) — resolve matching accounts first.
    const userFilter = { status: 'ACTIVE' };
    if (college) userFilter['profile.college'] = new RegExp(escapeRegex(college), 'i');
    if (location) userFilter['profile.city'] = new RegExp(escapeRegex(location), 'i');
    const users = await db.User.find(userFilter).select({ _id: 1 }).limit(5000).lean();
    match.userId = { $in: users.map((u) => u._id) };
  }
  const [rows, total] = await Promise.all([
    db.BuilderProfile.find(match).sort({ 'completion.score': -1, updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.BuilderProfile.countDocuments(match),
  ]);
  return { items: await buildersView(db, rows, hrUserId), total };
}

// ---- private hiring pipeline -------------------------------------------------------

async function candidatesView(db, rows) {
  const profiles = await db.BuilderProfile.find({ _id: { $in: rows.map((r) => r.builderProfileId) } }).lean();
  const users = await db.User.find({ _id: { $in: rows.map((r) => r.builderUserId) } }).select({ name: 1, profilePhotoId: 1 }).lean();
  const media = await loadMedia(db, users.map((u) => u.profilePhotoId));
  // Which opening this candidate is against, so the pipeline reads as "who, for what job".
  const jobs = await db.Job.find({ _id: { $in: rows.map((r) => r.jobId).filter(Boolean) } })
    .select({ title: 1, slug: 1 })
    .lean();
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
  return rows.map((c) => {
    const p = profileMap.get(String(c.builderProfileId));
    const u = userMap.get(String(c.builderUserId));
    const j = c.jobId ? jobMap.get(String(c.jobId)) : null;
    // A builder who later made their profile private keeps their row, but only their name shows.
    const isPublic = p?.visibility === 'PUBLIC';
    return {
      id: String(c._id),
      stage: c.stage,
      role: c.role ?? null,
      // Null for a talent-pool add; set when the candidate came in against a job post.
      job: j ? { id: String(j._id), title: j.title, slug: j.slug } : null,
      note: c.note ?? null,
      interviewAt: c.interviewAt ?? null,
      addedAt: c.createdAt,
      updatedAt: c.updatedAt,
      builder: {
        name: u?.name ?? null,
        username: isPublic ? p.username : null,
        headline: isPublic ? (p.headline ?? null) : null,
        photo: isPublic ? pick(media, u?.profilePhotoId) : null,
        skills: isPublic ? (p.skills ?? []).slice(0, 6).map((s) => ({ slug: s.slug, name: s.name })) : [],
        profilePublic: isPublic,
      },
    };
  });
}

export async function listCandidates(db, hrUserId, { stage, page, pageSize }) {
  const filter = { hrUserId };
  if (stage) filter.stage = Array.isArray(stage) ? { $in: stage } : stage;
  const sort = stage === 'INTERVIEW' ? { interviewAt: 1, updatedAt: -1 } : { updatedAt: -1 };
  const [rows, total] = await Promise.all([
    db.HrCandidate.find(filter).sort({ ...sort, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.HrCandidate.countDocuments(filter),
  ]);
  return { items: await candidatesView(db, rows), total };
}

/**
 * Shortlist a builder. `jobId` is optional: a talent-pool add has no opening, while shortlisting
 * from a job page ties the candidate to that post (and prefills the role label from its title).
 * One pipeline, two front doors (spec §96) — a job is not a second application model.
 */
export async function addCandidate(db, hrUserId, { username, role, note, jobId }) {
  const profile = await db.BuilderProfile.findOne({ username, visibility: 'PUBLIC' }).lean();
  if (!profile) throw AppError.notFound('Builder');
  if (String(profile.userId) === String(hrUserId)) throw new AppError('BAD_REQUEST', 'You can’t add yourself to your own pipeline.');

  let job = null;
  if (jobId) {
    // Owner-scoped: another HR account's job is a 404, exactly as it is on every other job read.
    job = await db.Job.findOne({ _id: jobId, hrUserId }).select({ title: 1 }).lean();
    if (!job) throw AppError.notFound('Job');
  }

  try {
    const doc = await db.HrCandidate.create({
      hrUserId,
      builderProfileId: profile._id,
      builderUserId: profile.userId,
      jobId: job?._id ?? null,
      role: role ?? job?.title ?? null,
      note: note ?? null,
    });
    return (await candidatesView(db, [doc.toObject()]))[0];
  } catch (err) {
    if (err?.code === 11000) throw new AppError('CONFLICT', 'This builder is already in your pipeline.');
    throw err;
  }
}

export async function updateCandidate(db, hrUserId, id, patch) {
  const row = await db.HrCandidate.findOne({ _id: id, hrUserId }).lean();
  if (!row) throw AppError.notFound('Candidate');
  await db.HrCandidate.updateOne({ _id: row._id }, { $set: patch }, { runValidators: true });
  // Inviting and offering reach out to the builder; earlier stages stay private to the HR user.
  const reachOut = { INVITED: 'invited you to interview', OFFER: 'made you an offer' };
  if (patch.stage && patch.stage !== row.stage && reachOut[patch.stage]) {
    const hr = await db.HrProfile.findOne({ userId: hrUserId }).select({ companyName: 1 }).lean();
    const role = patch.role ?? row.role;
    await createNotification(db, {
      userId: row.builderUserId,
      type: 'HR_INVITATION',
      title: `${hr?.companyName ?? 'A verified company'} ${reachOut[patch.stage]}${role ? ` for ${role}` : ''}`,
      body: patch.stage === 'INVITED' ? 'They found you through your STUDLYF profile and projects. Reply to them by email.' : null,
      data: { stage: patch.stage, company: hr?.companyName ?? null, path: '/notifications' },
      dedupeKey: `HR:${row._id}:${patch.stage}`,
    });
  }
  return (await candidatesView(db, [await db.HrCandidate.findById(id).lean()]))[0];
}

export async function removeCandidate(db, hrUserId, id) {
  const { deletedCount } = await db.HrCandidate.deleteOne({ _id: id, hrUserId });
  if (!deletedCount) throw AppError.notFound('Candidate');
  return { id };
}

export async function dashboard(db, hrUserId) {
  const [profile, stages, talentPool, upcoming, recent] = await Promise.all([
    getRequest(db, hrUserId),
    db.HrCandidate.aggregate([{ $match: { hrUserId: oid(hrUserId) } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
    db.BuilderProfile.countDocuments({ visibility: 'PUBLIC' }),
    db.HrCandidate.find({ hrUserId, stage: 'INTERVIEW', interviewAt: { $gte: new Date() } }).sort({ interviewAt: 1 }).limit(5).lean(),
    db.HrCandidate.find({ hrUserId }).sort({ updatedAt: -1 }).limit(5).lean(),
  ]);
  const pipeline = Object.fromEntries(HIRING_STAGES.map((s) => [s, 0]));
  for (const s of stages) pipeline[s._id] = s.n;
  return {
    profile,
    talentPool,
    pipeline,
    upcomingInterviews: await candidatesView(db, upcoming),
    recentCandidates: await candidatesView(db, recent),
  };
}
