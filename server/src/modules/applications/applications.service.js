import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { applicationStatus } from '../opportunities/opportunities.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import * as repo from './applications.repository.js';

const WITHDRAWABLE = new Set(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED']);

/** Legal admin review transitions keyed by the application's current status. */
const ADMIN_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'SELECTED', 'REJECTED'],
  SHORTLISTED: ['SELECTED', 'REJECTED'],
};

function isHttpUrl(v) {
  try {
    const u = new URL(String(v));
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validates submitted answers against an opportunity's questions and returns normalized answer docs.
 * `requireAll` enforces that every required question is answered (used at submit time, not on draft save).
 */
function buildAnswers(questions, submitted, { requireAll }) {
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const provided = new Map((submitted ?? []).map((a) => [a.questionId, a]));
  const errors = [];
  const out = [];

  for (const a of submitted ?? []) {
    if (!byId.has(a.questionId)) errors.push({ field: `answers.${a.questionId}`, message: 'Unknown question' });
  }

  for (const q of questions) {
    const qid = String(q._id);
    const a = provided.get(qid);
    const options = q.options ?? [];
    const hasText = a && a.text != null && a.text !== '';
    const hasChoices = a && Array.isArray(a.choices) && a.choices.length > 0;
    if (!hasText && !hasChoices) {
      if (requireAll && q.required) errors.push({ field: `answers.${qid}`, message: `"${q.label}" is required` });
      continue; // partial drafts are allowed to omit unanswered questions
    }
    const entry = { questionId: qid, type: q.type, text: null, choices: [] };
    switch (q.type) {
      case 'SHORT_TEXT':
      case 'LONG_TEXT':
        entry.text = String(a.text ?? '');
        break;
      case 'URL':
        if (!isHttpUrl(a.text)) errors.push({ field: `answers.${qid}`, message: 'Must be an http(s) URL' });
        entry.text = String(a.text ?? '');
        break;
      case 'BOOLEAN':
        if (!['true', 'false'].includes(String(a.text)))
          errors.push({ field: `answers.${qid}`, message: 'Must be true or false' });
        entry.text = String(a.text);
        break;
      case 'SINGLE_SELECT':
        if ((a.choices ?? []).length !== 1 || !options.includes(a.choices[0]))
          errors.push({ field: `answers.${qid}`, message: 'Select exactly one valid option' });
        entry.choices = a.choices ?? [];
        break;
      case 'MULTI_SELECT':
        if ((a.choices ?? []).some((c) => !options.includes(c)))
          errors.push({ field: `answers.${qid}`, message: 'Contains an invalid option' });
        entry.choices = a.choices ?? [];
        break;
      default:
        break;
    }
    out.push(entry);
  }
  if (errors.length) throw AppError.validation(errors);
  return out;
}

// ---- hydration & serializers ------------------------------------------------

const oppMini = (row) =>
  row
    ? {
        id: String(row._id),
        title: row.title,
        slug: row.slug,
        type: row.type,
        organizationName: row.organizationName,
        applicationStatus: applicationStatus(row),
      }
    : null;

const answersOut = (row) =>
  (row.answers ?? []).map((a) => ({
    questionId: String(a.questionId),
    type: a.type,
    text: a.text ?? null,
    choices: a.choices ?? [],
  }));

const historyOut = (row) =>
  (row.statusHistory ?? []).map((e) => ({ status: e.status, at: e.at, note: e.note ?? null }));

function toOwn(row, opp) {
  return {
    id: String(row._id),
    status: row.status,
    opportunity: oppMini(opp),
    answers: answersOut(row),
    reviewerNote: row.reviewerNote ?? null,
    submittedAt: row.submittedAt ?? null,
    withdrawnAt: row.withdrawnAt ?? null,
    statusHistory: historyOut(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const toAdmin = (row, opp, builder) => ({ ...toOwn(row, opp), builder });

/** Batch-loads the light opportunity shape referenced by a set of applications. */
async function loadOpportunities(db, ids) {
  const unique = [...new Set(ids.map(idOf).filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = await db.Opportunity.find({ _id: { $in: unique } })
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1 })
    .lean();
  return new Map(rows.map((r) => [String(r._id), r]));
}

/** Batch-loads the builder (user + profile) behind a set of applications for the admin views. */
async function loadBuilders(db, apps) {
  const userIds = [...new Set(apps.map((a) => idOf(a.builderUserId)).filter(Boolean))];
  const profileIds = [...new Set(apps.map((a) => idOf(a.builderProfileId)).filter(Boolean))];
  const [users, profiles] = await Promise.all([
    userIds.length ? db.User.find({ _id: { $in: userIds } }).select({ name: 1, email: 1 }).lean() : [],
    profileIds.length ? db.BuilderProfile.find({ _id: { $in: profileIds } }).select({ username: 1 }).lean() : [],
  ]);
  return {
    userMap: new Map(users.map((u) => [String(u._id), u])),
    profileMap: new Map(profiles.map((p) => [String(p._id), p])),
  };
}

const builderOf = (row, { userMap, profileMap }) => {
  const u = userMap.get(idOf(row.builderUserId));
  const p = profileMap.get(idOf(row.builderProfileId));
  return {
    userId: idOf(row.builderUserId),
    profileId: idOf(row.builderProfileId),
    name: u?.name ?? null,
    email: u?.email ?? null,
    username: p?.username ?? null,
  };
};

// ---- builder-facing operations ----------------------------------------------

export async function listOwn(db, userId, query) {
  const { rows, total } = await repo.listOwned(db, userId, query);
  const opps = await loadOpportunities(db, rows.map((r) => r.opportunityId));
  return { items: rows.map((r) => toOwn(r, opps.get(idOf(r.opportunityId)))), total };
}

export async function getOwn(db, userId, id) {
  const row = await repo.findOwned(db, userId, id);
  if (!row) throw AppError.notFound('Application');
  return toOwn(row, await repo.findOpportunity(db, idOf(row.opportunityId)));
}

export async function apply(db, userId, { opportunityId, answers }) {
  const opp = await repo.findOpportunity(db, opportunityId);
  if (!opp || opp.status !== 'PUBLISHED') throw AppError.notFound('Opportunity');
  if (applicationStatus(opp) !== 'OPEN')
    throw new AppError('BAD_REQUEST', 'This opportunity is no longer accepting applications');

  const profile = await db.BuilderProfile.findOne({ userId }).select({ _id: 1 }).lean();
  if (!profile) throw new AppError('BAD_REQUEST', 'Create your builder profile before applying');

  const normalized = buildAnswers(opp.applicationQuestions ?? [], answers, { requireAll: false });
  try {
    const doc = await repo.insert(db, {
      opportunityId: opp._id,
      builderUserId: userId,
      builderProfileId: profile._id,
      status: 'DRAFT',
      answers: normalized,
      statusHistory: [{ status: 'DRAFT', at: new Date(), byUserId: userId, note: null }],
    });
    return toOwn(await repo.findById(db, String(doc._id)), opp);
  } catch (err) {
    if (err?.code === 11000) throw new AppError('CONFLICT', 'You have already applied to this opportunity');
    throw err;
  }
}

export async function editDraft(db, userId, id, answers) {
  const row = await repo.findOwned(db, userId, id);
  if (!row) throw AppError.notFound('Application');
  if (row.status !== 'DRAFT') throw new AppError('CONFLICT', 'Only draft applications can be edited');
  const opp = await repo.findOpportunity(db, idOf(row.opportunityId));
  if (!opp) throw AppError.notFound('Opportunity');
  const normalized = buildAnswers(opp.applicationQuestions ?? [], answers, { requireAll: false });
  await repo.updateAnswers(db, id, normalized);
  return toOwn(await repo.findById(db, id), opp);
}

export async function submit(db, userId, id) {
  const row = await repo.findOwned(db, userId, id);
  if (!row) throw AppError.notFound('Application');
  if (row.status !== 'DRAFT') throw new AppError('CONFLICT', `Cannot submit an application in ${row.status} state`);
  const opp = await repo.findOpportunity(db, idOf(row.opportunityId));
  if (!opp || opp.status !== 'PUBLISHED') throw AppError.notFound('Opportunity');
  if (applicationStatus(opp) !== 'OPEN')
    throw new AppError('BAD_REQUEST', 'This opportunity is no longer accepting applications');
  // Re-validate stored answers, now enforcing required questions.
  buildAnswers(opp.applicationQuestions ?? [], answersOut(row), { requireAll: true });
  await repo.applyStatus(db, id, { status: 'SUBMITTED', byUserId: userId, extraSet: { submittedAt: new Date() } });
  return toOwn(await repo.findById(db, id), opp);
}

export async function withdraw(db, userId, id) {
  const row = await repo.findOwned(db, userId, id);
  if (!row) throw AppError.notFound('Application');
  if (!WITHDRAWABLE.has(row.status))
    throw new AppError('CONFLICT', `Cannot withdraw an application in ${row.status} state`);
  await repo.applyStatus(db, id, { status: 'WITHDRAWN', byUserId: userId, extraSet: { withdrawnAt: new Date() } });
  return toOwn(await repo.findById(db, id), await repo.findOpportunity(db, idOf(row.opportunityId)));
}

// ---- admin operations -------------------------------------------------------

export async function listForOpportunity(db, opportunityId, query) {
  const opp = await repo.findOpportunity(db, opportunityId);
  if (!opp) throw AppError.notFound('Opportunity');
  const { rows, total } = await repo.listByOpportunity(db, opportunityId, query);
  const builders = await loadBuilders(db, rows);
  return { items: rows.map((r) => toAdmin(r, opp, builderOf(r, builders))), total };
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Application');
  const opp = await repo.findOpportunity(db, idOf(row.opportunityId));
  const builders = await loadBuilders(db, [row]);
  return toAdmin(row, opp, builderOf(row, builders));
}

/** Admin status transition. Returns { application, builderUserId } so the route can audit + notify. */
export async function review(db, id, adminUserId, { status, reviewerNote }) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Application');
  const allowed = ADMIN_TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(status))
    throw new AppError('CONFLICT', `Cannot move an application from ${row.status} to ${status}`);

  await repo.applyStatus(db, id, {
    status,
    byUserId: adminUserId,
    note: reviewerNote ?? null,
    extraSet: { reviewerNote: reviewerNote ?? null },
  });

  const opp = await repo.findOpportunity(db, idOf(row.opportunityId));
  await createNotification(db, {
    userId: idOf(row.builderUserId),
    type: 'APPLICATION_STATUS',
    title: `Your application is now ${status.replace(/_/g, ' ').toLowerCase()}`,
    body: reviewerNote ?? null,
    data: {
      applicationId: String(row._id),
      opportunityId: idOf(row.opportunityId),
      opportunityTitle: opp?.title ?? null,
      status,
    },
  });

  const builders = await loadBuilders(db, [row]);
  const application = toAdmin(await repo.findById(db, id), opp, builderOf(row, builders));
  return { application, builderUserId: idOf(row.builderUserId) };
}

