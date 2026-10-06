import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { notifyMany, createNotification } from '../notifications/notifications.service.js';
import { advanceProjectStatus } from '../projects/status.js';
import { documentDownloadUrl, oppMini } from '../projects/projects.hydrate.js';
import { startReview } from '../submissions/submissions.service.js';
import { builderCanSee, evaluatorNames, oppMinis, toBuilderView } from './evaluations.views.js';
import { computeScores, missingRequired } from './scoring.js';

const ASSIGNABLE_SUBMISSIONS = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'];

// ---- assignment (admin) ---------------------------------------------------------------------

/**
 * Assign an evaluator to a submission. The rubric is snapshotted onto the evaluation now, so a
 * later template edit can't change how this submission is scored.
 */
export async function assign(deps, adminId, submissionId, { evaluatorUserId, templateId }) {
  const { db, config } = deps;
  const submission = await db.ProjectSubmission.findById(submissionId).lean();
  if (!submission) throw AppError.notFound('Submission');
  if (!ASSIGNABLE_SUBMISSIONS.includes(submission.status)) {
    throw new AppError('CONFLICT', `A ${submission.status.toLowerCase().replace('_', ' ')} submission can’t be assigned for evaluation.`);
  }
  const evaluator = await db.User.findOne({ _id: evaluatorUserId, status: 'ACTIVE', 'roles.role': 'EVALUATOR' }).select({ name: 1 }).lean();
  if (!evaluator) throw AppError.validation([{ field: 'evaluatorUserId', message: 'That user isn’t an active evaluator' }]);
  if (await db.ProjectMember.exists({ projectId: submission.projectId, userId: evaluatorUserId })) {
    throw new AppError('CONFLICT', 'Evaluators can’t review a project they’re on the team of.');
  }

  const opp = await db.Opportunity.findById(submission.opportunityId).lean();
  const tid = templateId ?? idOf(opp?.submissionSettings?.evaluationTemplateId);
  if (!tid) throw AppError.validation([{ field: 'templateId', message: 'Choose an evaluation template (this opportunity has no default).' }]);
  const template = await db.EvaluationTemplate.findById(tid).lean();
  if (!template) throw AppError.validation([{ field: 'templateId', message: 'Unknown evaluation template' }]);
  if (!template.isActive) throw AppError.validation([{ field: 'templateId', message: 'That template isn’t active' }]);
  if (template.opportunityId && String(template.opportunityId) !== String(submission.opportunityId)) {
    throw AppError.validation([{ field: 'templateId', message: 'That template belongs to a different opportunity' }]);
  }

  let evaluation;
  try {
    evaluation = await db.Evaluation.create({
      submissionId: submission._id,
      projectId: submission.projectId,
      opportunityId: submission.opportunityId,
      evaluatorId: evaluator._id,
      templateId: template._id,
      templateName: template.name,
      status: 'ASSIGNED',
      scores: [...template.criteria]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          criterionId: c._id,
          name: c.name,
          description: c.description ?? null,
          maxScore: c.maxScore,
          weight: c.weight,
          required: c.required,
          order: c.order,
          score: null,
          weightedScore: null,
          feedback: null,
          feedbackVisibility: 'BUILDER_VISIBLE',
        })),
      assignedBy: adminId,
      assignedAt: new Date(),
    });
  } catch (err) {
    if (err?.code === 11000) throw new AppError('CONFLICT', 'This evaluator is already assigned to this submission.');
    throw err;
  }

  await startReview(db, submission, adminId);
  await createNotification(db, {
    userId: evaluator._id,
    type: 'EVALUATION_ASSIGNED',
    title: `New evaluation: “${submission.projectSnapshot?.title ?? 'a project'}”`,
    body: opp ? `Submitted to ${opp.title}. Score it against “${template.name}”.` : null,
    data: { evaluationId: String(evaluation._id), submissionId: String(submission._id) },
    dedupeKey: `EVAL_ASSIGNED:${evaluation._id}`,
  });
  return getAdmin(db, evaluation._id, config);
}

export async function unassign(db, id) {
  const ev = await db.Evaluation.findById(id).lean();
  if (!ev) throw AppError.notFound('Evaluation');
  if (ev.status === 'COMPLETED') throw new AppError('CONFLICT', 'Completed evaluations are part of the record and can’t be removed.');
  await db.Evaluation.deleteOne({ _id: ev._id });
  return { id: String(ev._id), submissionId: String(ev.submissionId), evaluatorId: String(ev.evaluatorId) };
}

// ---- evaluator workspace ------------------------------------------------------------------------

function progressOf(scores) {
  const scored = scores.filter((s) => s.score !== null && s.score !== undefined).length;
  return {
    scored,
    total: scores.length,
    required: scores.filter((s) => s.required).length,
    missingRequired: missingRequired(scores).map((s) => s.name),
  };
}

async function ownEvaluation(db, evaluatorId, id) {
  const ev = await db.Evaluation.findOne({ _id: id, evaluatorId }).lean();
  // Never confirm that someone else's evaluation exists.
  if (!ev) throw AppError.notFound('Evaluation');
  return ev;
}

async function listItemsFor(db, rows) {
  const submissions = await db.ProjectSubmission.find({ _id: { $in: rows.map((r) => r.submissionId) } })
    .select({ projectSnapshot: 1, submittedAt: 1 })
    .lean();
  const subMap = new Map(submissions.map((s) => [String(s._id), s]));
  const opps = await db.Opportunity.find({ _id: { $in: rows.map((r) => r.opportunityId) } })
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1 })
    .lean();
  const oppMap = new Map(opps.map((o) => [String(o._id), o]));
  const media = await loadMedia(db, submissions.map((s) => s.projectSnapshot?.coverImageId));
  return rows.map((ev) => {
    const sub = subMap.get(String(ev.submissionId));
    const opp = oppMap.get(String(ev.opportunityId));
    return {
      id: String(ev._id),
      status: ev.status,
      templateName: ev.templateName,
      opportunity: oppMini(opp),
      project: { title: sub?.projectSnapshot?.title ?? 'Project', tagline: sub?.projectSnapshot?.tagline ?? null, coverImage: pick(media, sub?.projectSnapshot?.coverImageId) },
      submittedAt: sub?.submittedAt ?? null,
      dueAt: opp?.endDate ?? opp?.applicationDeadline ?? null,
      assignedAt: ev.assignedAt,
      completedAt: ev.completedAt ?? null,
      overallScore: ev.status === 'COMPLETED' ? ev.overallScore : null,
      progress: progressOf(ev.scores ?? []),
    };
  });
}

export async function listForEvaluator(db, evaluatorId, { status, page, pageSize }) {
  const filter = { evaluatorId };
  if (status) filter.status = status;
  const [rows, total, counts] = await Promise.all([
    db.Evaluation.find(filter).sort({ assignedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Evaluation.countDocuments(filter),
    // Aggregations skip Mongoose casting — the session id must be cast explicitly.
    db.Evaluation.aggregate([
      { $match: { evaluatorId: new mongoose.Types.ObjectId(String(evaluatorId)) } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
  ]);
  const byStatus = { ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  for (const c of counts) byStatus[c._id] = c.n;
  return { items: await listItemsFor(db, rows), total, counts: byStatus };
}

/**
 * The evaluation workspace: the project exactly as submitted (snapshot), the team's names and
 * roles only (no contact details), the opportunity, and the rubric with the evaluator's scores.
 */
export async function getForEvaluator(deps, evaluatorId, id) {
  const { db, config } = deps;
  const ev = await ownEvaluation(db, evaluatorId, id);
  return workspaceView(db, config, ev);
}

async function workspaceView(db, config, ev) {
  const submission = await db.ProjectSubmission.findById(ev.submissionId).lean();
  const opp = await db.Opportunity.findById(ev.opportunityId)
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1, eligibility: 1, submissionSettings: 1 })
    .lean();
  const snap = submission?.projectSnapshot ?? {};
  const screenshotIds = (snap.media ?? []).filter((m) => m.kind === 'SCREENSHOT').map((m) => m.assetId);
  const docIds = (snap.media ?? []).filter((m) => m.kind === 'DOCUMENT').map((m) => m.assetId);
  const [media, docs, project] = await Promise.all([
    loadMedia(db, [snap.coverImageId, ...screenshotIds]),
    db.MediaAsset.find({ _id: { $in: docIds } }).select({ originalName: 1 }).lean(),
    db.Project.findById(ev.projectId).select({ slug: 1, visibility: 1, publishedAt: 1 }).lean(),
  ]);
  const docMap = new Map(docs.map((d) => [String(d._id), d]));
  const scores = [...(ev.scores ?? [])].sort((a, b) => a.order - b.order);
  return {
    id: String(ev._id),
    status: ev.status,
    templateName: ev.templateName,
    assignedAt: ev.assignedAt,
    startedAt: ev.startedAt ?? null,
    completedAt: ev.completedAt ?? null,
    opportunity: opp ? { ...oppMini(opp), guidelines: opp.submissionSettings?.guidelines ?? null } : null,
    submission: { id: String(ev.submissionId), submittedAt: submission?.submittedAt ?? null, note: submission?.note ?? null },
    project: {
      slug: project?.slug ?? null,
      title: snap.title ?? 'Project',
      tagline: snap.tagline ?? null,
      description: snap.description ?? null,
      problemStatement: snap.problemStatement ?? null,
      solution: snap.solution ?? null,
      impact: snap.impact ?? null,
      category: snap.category ?? null,
      projectType: snap.projectType ?? null,
      technologies: snap.technologies ?? [],
      skills: snap.skills ?? [],
      links: { repo: snap.links?.repo ?? null, demo: snap.links?.demo ?? null, video: snap.links?.video ?? null, website: snap.links?.website ?? null },
      coverImage: pick(media, snap.coverImageId),
      screenshots: (snap.media ?? [])
        .filter((m) => m.kind === 'SCREENSHOT')
        .map((m) => ({ caption: m.caption ?? null, asset: pick(media, m.assetId) })),
      documents: (snap.media ?? [])
        .filter((m) => m.kind === 'DOCUMENT')
        .map((m) => ({
          caption: m.caption ?? null,
          name: docMap.get(idOf(m.assetId))?.originalName ?? 'Document',
          downloadUrl: documentDownloadUrl(config, idOf(m.assetId)),
        })),
      teamName: snap.teamName ?? null,
      team: (snap.team ?? []).map((t) => ({ name: t.name ?? null, username: t.username ?? null, role: t.role })),
      snapshotAt: snap.capturedAt ?? null,
    },
    criteria: scores.map((s) => ({
      criterionId: String(s.criterionId),
      name: s.name,
      description: s.description ?? null,
      maxScore: s.maxScore,
      weight: s.weight,
      required: s.required,
      score: s.score ?? null,
      weightedScore: s.weightedScore ?? null,
      feedback: s.feedback ?? null,
      feedbackVisibility: s.feedbackVisibility,
    })),
    overallScore: ev.overallScore ?? null,
    maxScore: ev.maxScore ?? 100,
    overallFeedback: ev.overallFeedback ?? null,
    overallFeedbackVisibility: ev.overallFeedbackVisibility,
    scoreVisibility: ev.scoreVisibility,
    internalNotes: ev.internalNotes ?? null,
    showEvaluatorIdentity: ev.showEvaluatorIdentity,
    progress: progressOf(scores),
  };
}

/** Apply an evaluator's edits to a (not yet completed) evaluation, returning the $set. */
function applyEdits(ev, body) {
  const byId = new Map((ev.scores ?? []).map((s) => [String(s.criterionId), { ...s }]));
  const errors = [];
  (body.scores ?? []).forEach((input, i) => {
    const row = byId.get(input.criterionId);
    if (!row) {
      errors.push({ field: `scores.${i}.criterionId`, message: 'This criterion isn’t part of the evaluation' });
      return;
    }
    if (input.score !== undefined) {
      if (input.score !== null && input.score > row.maxScore) {
        errors.push({ field: `scores.${i}.score`, message: `“${row.name}” is scored out of ${row.maxScore}` });
        return;
      }
      row.score = input.score;
    }
    if (input.feedback !== undefined) row.feedback = input.feedback;
    if (input.feedbackVisibility !== undefined) row.feedbackVisibility = input.feedbackVisibility;
    byId.set(input.criterionId, row);
  });
  if (errors.length) throw AppError.validation(errors);

  const { scores, overallScore } = computeScores([...byId.values()].sort((a, b) => a.order - b.order));
  const set = { scores, overallScore };
  for (const k of ['overallFeedback', 'overallFeedbackVisibility', 'scoreVisibility', 'internalNotes', 'showEvaluatorIdentity']) {
    if (body[k] !== undefined) set[k] = body[k];
  }
  return set;
}

function assertEditable(ev) {
  if (ev.status === 'COMPLETED') {
    throw new AppError('CONFLICT', 'This evaluation is completed and can no longer be changed.');
  }
}

export async function save(deps, evaluatorId, id, body) {
  const { db, config } = deps;
  const ev = await ownEvaluation(db, evaluatorId, id);
  assertEditable(ev);
  const set = applyEdits(ev, body);
  if (ev.status === 'ASSIGNED') {
    set.status = 'IN_PROGRESS';
    set.startedAt = new Date();
  }
  // Guarded on status so a concurrent completion can't be overwritten.
  const { modifiedCount } = await db.Evaluation.updateOne({ _id: ev._id, status: { $ne: 'COMPLETED' } }, { $set: set });
  if (!modifiedCount) assertEditable(await db.Evaluation.findById(ev._id).lean());
  return workspaceView(db, config, await db.Evaluation.findById(ev._id).lean());
}

/**
 * Complete an evaluation: every REQUIRED criterion must be scored. The weighted result is final
 * — the document is never modified again. The project advances to EVALUATED and the team is told.
 */
export async function complete(deps, evaluatorId, id, body = {}) {
  const { db, config } = deps;
  const ev = await ownEvaluation(db, evaluatorId, id);
  assertEditable(ev);
  const set = applyEdits(ev, body);
  const missing = missingRequired(set.scores);
  if (missing.length) {
    throw AppError.validation(
      missing.map((s) => ({ field: `scores.${String(s.criterionId)}`, message: `Score “${s.name}” before completing` })),
      'This evaluation cannot be completed until all required criteria are scored.',
    );
  }
  const now = new Date();
  Object.assign(set, { status: 'COMPLETED', completedAt: now, startedAt: ev.startedAt ?? now });
  const { modifiedCount } = await db.Evaluation.updateOne({ _id: ev._id, status: { $ne: 'COMPLETED' } }, { $set: set });
  if (!modifiedCount) throw new AppError('CONFLICT', 'This evaluation is completed and can no longer be changed.');

  const completed = await db.Evaluation.findById(ev._id).lean();
  await advanceProjectStatus(db, ev.projectId, 'EVALUATED');
  const [project, opp, team] = await Promise.all([
    db.Project.findById(ev.projectId).select({ title: 1, slug: 1 }).lean(),
    db.Opportunity.findById(ev.opportunityId).select({ title: 1 }).lean(),
    db.ProjectMember.find({ projectId: ev.projectId, status: 'ACTIVE' }).select({ userId: 1 }).lean(),
  ]);
  const visible = builderCanSee(completed);
  await notifyMany(db, team.map((m) => m.userId), {
    type: 'EVALUATION_COMPLETED',
    title: `“${project?.title ?? 'Your project'}” has been evaluated${opp ? ` for ${opp.title}` : ''}`,
    body: visible ? 'Your results and feedback are ready.' : 'The organisers have recorded their evaluation.',
    data: { evaluationId: String(ev._id), submissionId: String(ev.submissionId), projectId: String(ev.projectId), visible },
    dedupeKey: `EVAL_COMPLETED:${ev._id}`,
  });
  return workspaceView(db, config, completed);
}

// ---- builder results ---------------------------------------------------------------------------

/** Completed evaluations of the caller's projects that the team is allowed to see. */
export async function listForBuilder(db, userId, { page, pageSize }) {
  const memberships = await db.ProjectMember.find({ userId, status: 'ACTIVE' }).select({ projectId: 1 }).lean();
  const rows = (
    await db.Evaluation.find({ projectId: { $in: memberships.map((m) => m.projectId) }, status: 'COMPLETED' })
      .sort({ completedAt: -1, _id: -1 })
      .lean()
  ).filter(builderCanSee);
  const total = rows.length;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const [opps, names, projects] = await Promise.all([
    oppMinis(db, pageRows),
    evaluatorNames(db, pageRows),
    db.Project.find({ _id: { $in: pageRows.map((r) => r.projectId) } }).select({ title: 1, slug: 1 }).lean(),
  ]);
  const projectMap = new Map(projects.map((p) => [String(p._id), { id: String(p._id), slug: p.slug, title: p.title }]));
  return {
    items: pageRows.map((ev) =>
      toBuilderView(ev, {
        opportunity: opps.get(idOf(ev.opportunityId)) ?? null,
        project: projectMap.get(idOf(ev.projectId)) ?? null,
        evaluatorName: names.get(idOf(ev.evaluatorId)),
      }),
    ),
    total,
  };
}

export async function getForBuilder(db, userId, id) {
  const ev = await db.Evaluation.findById(id).lean();
  const member = ev && (await db.ProjectMember.exists({ projectId: ev.projectId, userId, status: 'ACTIVE' }));
  if (!ev || !member || !builderCanSee(ev)) throw AppError.notFound('Evaluation');
  const [opps, names, project] = await Promise.all([
    oppMinis(db, [ev]),
    evaluatorNames(db, [ev]),
    db.Project.findById(ev.projectId).select({ title: 1, slug: 1 }).lean(),
  ]);
  return toBuilderView(ev, {
    opportunity: opps.get(idOf(ev.opportunityId)) ?? null,
    project: project ? { id: String(project._id), slug: project.slug, title: project.title } : null,
    evaluatorName: names.get(idOf(ev.evaluatorId)),
  });
}

// ---- admin views ------------------------------------------------------------------------------

async function adminRows(db, rows) {
  const [items, evaluators] = await Promise.all([
    listItemsFor(db, rows),
    db.User.find({ _id: { $in: rows.map((r) => r.evaluatorId) } }).select({ name: 1, email: 1 }).lean(),
  ]);
  const evalMap = new Map(evaluators.map((u) => [String(u._id), u]));
  return items.map((it, i) => {
    const ev = rows[i];
    const u = evalMap.get(String(ev.evaluatorId));
    return {
      ...it,
      submissionId: String(ev.submissionId),
      projectId: String(ev.projectId),
      evaluator: { id: String(ev.evaluatorId), name: u?.name ?? null, email: u?.email ?? null },
      scoreVisibility: ev.scoreVisibility,
      overallScore: ev.overallScore ?? null,
    };
  });
}

export async function listAdmin(db, { status, opportunityId, evaluatorId, submissionId, page, pageSize }) {
  const filter = {};
  if (status) filter.status = status;
  if (opportunityId) filter.opportunityId = opportunityId;
  if (evaluatorId) filter.evaluatorId = evaluatorId;
  if (submissionId) filter.submissionId = submissionId;
  const [rows, total] = await Promise.all([
    db.Evaluation.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Evaluation.countDocuments(filter),
  ]);
  return { items: await adminRows(db, rows), total };
}

/** Admins see everything, including internal notes and every visibility setting. */
export async function getAdmin(db, id, config = null) {
  const ev = await db.Evaluation.findById(id).lean();
  if (!ev) throw AppError.notFound('Evaluation');
  const [row] = await adminRows(db, [ev]);
  const workspace = await workspaceView(db, config ?? { apiPublicUrl: '' }, ev);
  return { ...workspace, evaluator: row.evaluator, submissionId: row.submissionId, projectId: row.projectId };
}

// ---- evaluator management (admin) ------------------------------------------------------------------

export async function listEvaluators(db) {
  const users = await db.User.find({ 'roles.role': 'EVALUATOR' }).select({ name: 1, email: 1, status: 1 }).sort({ name: 1 }).lean();
  const load = await db.Evaluation.aggregate([
    { $match: { evaluatorId: { $in: users.map((u) => u._id) } } },
    { $group: { _id: { evaluatorId: '$evaluatorId', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const workload = new Map();
  for (const l of load) {
    const key = String(l._id.evaluatorId);
    const w = workload.get(key) ?? { ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    w[l._id.status] = l.n;
    workload.set(key, w);
  }
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    status: u.status,
    workload: workload.get(String(u._id)) ?? { ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0 },
  }));
}

export async function grantEvaluator(db, { email, userId }) {
  const user = await db.User.findOne(email ? { email } : { _id: userId }).select({ name: 1, email: 1, status: 1 }).lean();
  if (!user) throw AppError.validation([{ field: email ? 'email' : 'userId', message: 'No STUDLYF account found' }]);
  if (user.status !== 'ACTIVE') throw new AppError('CONFLICT', 'That account isn’t active.');
  await db.User.updateOne(
    { _id: user._id, 'roles.role': { $ne: 'EVALUATOR' } },
    { $push: { roles: { role: 'EVALUATOR', grantedAt: new Date() } } },
  );
  await createNotification(db, {
    userId: user._id,
    type: 'SYSTEM',
    title: 'You’re now a STUDLYF evaluator',
    body: 'Assigned project evaluations will appear in your evaluator dashboard.',
    dedupeKey: `EVALUATOR_GRANTED:${user._id}:${Date.now()}`,
  });
  return { id: String(user._id), name: user.name, email: user.email };
}

export async function revokeEvaluator(db, userId) {
  const open = await db.Evaluation.exists({ evaluatorId: userId, status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } });
  if (open) throw new AppError('CONFLICT', 'This evaluator still has open evaluations — reassign or complete them first.');
  const { modifiedCount } = await db.User.updateOne({ _id: userId }, { $pull: { roles: { role: 'EVALUATOR' } } });
  if (!modifiedCount) throw AppError.notFound('Evaluator');
  return { id: userId };
}
