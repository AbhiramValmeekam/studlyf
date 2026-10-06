import { idOf } from '../../common/utilities/media.js';
import { serialize as serializeAchievements } from '../achievements/achievements.service.js';
import { builderCanSee, evaluatorNames, oppMinis, toBuilderView, toPublicView } from '../evaluations/evaluations.views.js';
import { isDiscoverable } from '../projects/access.js';
import { PARTICIPATING, hydrateProjects, oppMini, toCard } from '../projects/projects.hydrate.js';

/**
 * Proof-of-work evidence for a builder. Deliberately NO single "talent score": each piece of
 * evidence (projects, participation, outcomes, achievements, evaluations) stays visible on its own.
 */

async function memberProjects(db, userId) {
  const memberships = await db.ProjectMember.find({ userId, status: 'ACTIVE' }).select({ projectId: 1 }).lean();
  return db.Project.find({ _id: { $in: memberships.map((m) => m.projectId) } }).sort({ updatedAt: -1 }).lean();
}

function outcomeCounts(submissions) {
  const participated = new Set();
  const shortlisted = new Set();
  const selected = new Set();
  for (const s of submissions) {
    if (PARTICIPATING.includes(s.status)) participated.add(String(s.opportunityId));
    // A selected project was shortlisted along the way; count it in both.
    if (s.status === 'SHORTLISTED' || s.status === 'SELECTED') shortlisted.add(String(s.projectId));
    if (s.status === 'SELECTED') selected.add(String(s.projectId));
  }
  return { opportunitiesParticipated: participated.size, shortlistedProjects: shortlisted.size, selectedProjects: selected.size };
}

/** The builder's own dashboard section: metrics + recent projects, submissions, achievements, evaluations. */
export async function builderSummary(db, userId) {
  const projects = await memberProjects(db, userId);
  const ids = projects.map((p) => p._id);
  const [submissions, achievementRows, achievementCount, evaluations, invitations] = await Promise.all([
    db.ProjectSubmission.find({ projectId: { $in: ids } }).sort({ updatedAt: -1 }).lean(),
    db.Achievement.find({ userId }).sort({ date: -1, _id: -1 }).limit(4).lean(),
    db.Achievement.countDocuments({ userId }),
    db.Evaluation.find({ projectId: { $in: ids }, status: 'COMPLETED' }).sort({ completedAt: -1 }).lean(),
    db.ProjectMember.countDocuments({ userId, status: 'INVITED' }),
  ]);
  const visibleEvaluations = evaluations.filter(builderCanSee);

  const h = await hydrateProjects(db, projects.slice(0, 4), { withSubmissions: true });
  const recentSubs = submissions.slice(0, 5);
  const oppRows = await db.Opportunity.find({ _id: { $in: recentSubs.map((s) => s.opportunityId) } })
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1 })
    .lean();
  const oppMap = new Map(oppRows.map((o) => [String(o._id), o]));
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));
  const [opps, names] = await Promise.all([oppMinis(db, visibleEvaluations.slice(0, 3)), evaluatorNames(db, visibleEvaluations.slice(0, 3))]);

  return {
    metrics: {
      totalProjects: projects.length,
      publishedProjects: projects.filter((p) => p.publishedAt && p.visibility !== 'PRIVATE').length,
      completedProjects: projects.filter((p) => !!p.completedAt).length,
      ...outcomeCounts(submissions),
      achievements: achievementCount,
      evaluations: visibleEvaluations.length,
    },
    pendingInvitations: invitations,
    projects: projects.slice(0, 4).map((p) => toCard(p, h, { own: true })),
    recentSubmissions: recentSubs.map((s) => {
      const project = projectMap.get(String(s.projectId));
      return {
        id: String(s._id),
        status: s.status,
        opportunity: oppMini(oppMap.get(idOf(s.opportunityId))),
        project: project ? { id: String(project._id), slug: project.slug, title: project.title } : null,
        submittedAt: s.submittedAt ?? null,
        updatedAt: s.updatedAt,
      };
    }),
    achievements: await serializeAchievements(db, achievementRows, 'owner'),
    recentEvaluations: visibleEvaluations.slice(0, 3).map((ev) => {
      const project = projectMap.get(String(ev.projectId));
      return toBuilderView(ev, {
        opportunity: opps.get(idOf(ev.opportunityId)) ?? null,
        project: project ? { id: String(project._id), slug: project.slug, title: project.title } : null,
        evaluatorName: names.get(idOf(ev.evaluatorId)),
      });
    }),
  };
}

/**
 * Public evidence on a builder's profile. Counts only public projects, public achievements and
 * evaluations their organisers marked PUBLIC; rejections are never broadcast.
 */
export async function publicSummary(db, userId, featuredProjectIds = []) {
  const all = await memberProjects(db, userId);
  const projects = all.filter((p) => isDiscoverable(p));
  const ids = projects.map((p) => p._id);
  const [submissions, achievementRows, achievementCount, evaluations] = await Promise.all([
    db.ProjectSubmission.find({ projectId: { $in: ids }, status: { $in: PARTICIPATING } }).sort({ submittedAt: -1 }).lean(),
    db.Achievement.find({ userId, visibility: 'PUBLIC', verificationStatus: { $ne: 'REJECTED' } }).sort({ date: -1, _id: -1 }).limit(6).lean(),
    db.Achievement.countDocuments({ userId, visibility: 'PUBLIC', verificationStatus: { $ne: 'REJECTED' } }),
    db.Evaluation.find({ projectId: { $in: ids }, status: 'COMPLETED', scoreVisibility: 'PUBLIC' }).sort({ completedAt: -1 }).lean(),
  ]);

  const featuredRows = featuredProjectIds.map((id) => projects.find((p) => String(p._id) === String(id))).filter(Boolean);
  const h = await hydrateProjects(db, featuredRows);
  const oppRows = await db.Opportunity.find({ _id: { $in: submissions.map((s) => s.opportunityId) } })
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1 })
    .lean();
  const oppMap = new Map(oppRows.map((o) => [String(o._id), o]));
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));
  const evalOpps = await oppMinis(db, evaluations);
  const { opportunitiesParticipated, shortlistedProjects, selectedProjects } = outcomeCounts(submissions);

  return {
    metrics: {
      projects: projects.length,
      completedProjects: projects.filter((p) => !!p.completedAt).length,
      opportunitiesParticipated,
      shortlistedProjects,
      selectedProjects,
      achievements: achievementCount,
      verifiedAchievements: achievementRows.filter((a) => a.verificationStatus === 'VERIFIED').length,
      evaluations: evaluations.length,
    },
    featuredProjects: featuredRows.map((p) => toCard(p, h)),
    achievements: await serializeAchievements(db, achievementRows, 'public'),
    participation: submissions.map((s) => {
      const project = projectMap.get(String(s.projectId));
      return {
        opportunity: oppMini(oppMap.get(idOf(s.opportunityId))),
        project: project ? { slug: project.slug, title: project.title } : null,
        outcome: s.status === 'SELECTED' || s.status === 'SHORTLISTED' ? s.status : 'PARTICIPATED',
        submittedAt: s.submittedAt ?? null,
      };
    }),
    evaluations: evaluations.map((ev) => {
      const project = projectMap.get(String(ev.projectId));
      return {
        ...toPublicView(ev, { opportunity: evalOpps.get(idOf(ev.opportunityId)) ?? null }),
        project: project ? { slug: project.slug, title: project.title } : null,
      };
    }),
  };
}

