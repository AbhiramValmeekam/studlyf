import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import { assertCategory, categoryOf, ensureTags, loadCategories } from '../taxonomy/taxonomy.service.js';
import * as repo from './jobs.repository.js';

async function hydrate(db, rows) {
  const [media, categories] = await Promise.all([
    loadMedia(db, rows.map((r) => r.bannerId)),
    loadCategories(db, rows.map((r) => r.categoryId)),
  ]);
  return { media, categories };
}

/** Open while the deadline (if any) has not passed. Mirrors the opportunity's rule. */
export function applicationStatus(row, at = new Date()) {
  return !row.applicationDeadline || row.applicationDeadline > at ? 'OPEN' : 'CLOSED';
}

const byOrder = (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
const orderedList = (rows) => (rows ?? []).slice().sort(byOrder);
/** Array position is the display order unless the caller set one. */
const normalizeList = (items) => (items ?? []).map((it, i) => ({ ...it, displayOrder: it.displayOrder ?? i }));

const skillsOf = (row) => (row.skills ?? []).map(({ name, slug }) => ({ name, slug }));

/**
 * Compensation as the public sees it. An undisclosed range is masked, not dropped — the page still
 * says "on request" rather than pretending the field was never set. The poster's own view passes
 * `masked: false`, so the numbers it stored survive a round-trip into the edit wizard.
 */
function salaryOf(row, masked = true) {
  const disclosed = row.salaryDisclosed !== false;
  const show = disclosed || !masked;
  return {
    disclosed,
    min: show ? (row.salaryMin ?? null) : null,
    max: show ? (row.salaryMax ?? null) : null,
    currency: row.salaryCurrency ?? null,
    period: row.salaryPeriod ?? null,
  };
}

function processBlocks(row) {
  return {
    rounds: orderedList(row.rounds).map((r) => ({
      title: r.title,
      description: r.description ?? null,
      startsAt: r.startsAt ?? null,
      endsAt: r.endsAt ?? null,
      mode: r.mode ?? null,
      location: r.location ?? null,
    })),
    faqs: orderedList(row.faqs).map((f) => ({ question: f.question, answer: f.answer ?? null })),
  };
}

/**
 * Public shape: an explicit allow-list. `status`, the HR user, their profile id and every
 * internal timestamp stay behind; the company name is the one STUDLYF verified.
 */
function toPublic(row, h, detail) {
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    company: { name: row.companyName, verified: true },
    summary: row.summary,
    employmentType: row.employmentType,
    workMode: row.workMode,
    experienceLevel: row.experienceLevel ?? null,
    location: row.location ?? null,
    openings: row.openings ?? 1,
    minExperienceYears: row.minExperienceYears ?? null,
    maxExperienceYears: row.maxExperienceYears ?? null,
    salary: salaryOf(row),
    skills: skillsOf(row),
    category: categoryOf(h.categories, row.categoryId),
    banner: pick(h.media, row.bannerId),
    applicationDeadline: row.applicationDeadline ?? null,
    startDate: row.startDate ?? null,
    applicationStatus: applicationStatus(row),
    featured: !!row.featured,
    publishedAt: row.publishedAt ?? null,
    ...(detail
      ? {
          description: row.description ?? null,
          responsibilities: row.responsibilities ?? null,
          requirements: row.requirements ?? null,
          perks: row.perks ?? [],
          externalUrl: row.externalUrl ?? null,
          contactEmail: row.contactEmail ?? null,
          ...processBlocks(row),
        }
      : {}),
  };
}

/** The poster's own view — every id the wizard needs to round-trip, plus the pipeline count. */
function toAdmin(row, h) {
  return {
    ...toPublic(row, h, true),
    // The owner sees the numbers it stored even when the posting hides them publicly.
    salary: salaryOf(row, false),
    bannerId: idOf(row.bannerId),
    categoryId: idOf(row.categoryId),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const searchFields = (d) => ({
  searchTerms: termsOf(
    d.title,
    d.companyName,
    d.summary,
    d.location,
    ...(d.skills ?? []).map((s) => s.name),
    // The process and FAQ blocks carry real prose ("System design round") — without them the new
    // sections would be invisible to search and the omission would only surface later.
    ...(d.rounds ?? []).map((r) => r.title),
    ...(d.rounds ?? []).map((r) => r.description),
    ...(d.faqs ?? []).map((f) => f.question),
    ...(d.perks ?? []),
  ),
  titleTerms: termsOf(d.title),
});

/** A banner must actually exist — nothing else validates the reference. */
async function assertBanner(db, bannerId) {
  if (bannerId && !(await db.MediaAsset.exists({ _id: bannerId }))) {
    throw AppError.validation([{ field: 'bannerId', message: 'Unknown image — upload it again' }]);
  }
}

/** FAQ answers are rich text; round descriptions stay capped plain text. */
const sanitizeFaqs = (faqs) =>
  normalizeList(faqs).map((f) => ({ ...f, answer: f.answer ? sanitizeRichText(f.answer) : null }));

/** Only a verified, ACTIVE HR account may post — the company name is taken from its record. */
async function hrIdentity(db, userId) {
  const profile = await db.HrProfile.findOne({ userId }).lean();
  if (!profile || profile.status !== 'ACTIVE') {
    throw new AppError('FORBIDDEN', 'Your HR access is not active yet.');
  }
  return profile;
}

export async function toPublicList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toPublic(r, h, false));
}

export async function getPublicBySlug(db, slug) {
  const row = await repo.findPublicBySlug(db, slug);
  if (!row) throw AppError.notFound('Job');
  return toPublic(row, await hydrate(db, [row]), true);
}

export async function toAdminList(db, rows, hrUserId) {
  const h = await hydrate(db, rows);
  const counts = await repo.pipelineCounts(db, hrUserId, rows.map((r) => r._id));
  return rows.map((r) => ({ ...toAdmin(r, h), pipelineCount: counts.get(String(r._id)) ?? 0 }));
}

export async function getAdmin(db, id, hrUserId) {
  const row = await repo.findForHr(db, id, hrUserId);
  if (!row) throw AppError.notFound('Job');
  const counts = await repo.pipelineCounts(db, hrUserId, [row._id]);
  return { ...toAdmin(row, await hydrate(db, [row])), pipelineCount: counts.get(String(row._id)) ?? 0 };
}

/** One HR user's jobs. Returns the raw rows so the route can page them. */
export async function listMine(db, hrUserId, query) {
  return repo.listForHr(db, hrUserId, query);
}

export async function create(db, input, userId) {
  const profile = await hrIdentity(db, userId);
  const { skills, slug, description, responsibilities, requirements, perks, rounds, faqs, ...rest } = input;
  await assertCategory(db, rest.categoryId, 'OPPORTUNITY');
  await assertBanner(db, rest.bannerId);
  const embeddedSkills = skills?.length ? await ensureTags(db, skills) : [];
  const doc = await db.Job.create({
    ...rest,
    hrUserId: userId,
    hrProfileId: profile._id,
    // Denormalised from the verified record, never from the request.
    companyName: profile.companyName,
    slug: await resolveSlug(db.Job, { explicit: slug, from: rest.title }),
    description: description ? sanitizeRichText(description) : null,
    responsibilities: responsibilities ? sanitizeRichText(responsibilities) : null,
    requirements: requirements ? sanitizeRichText(requirements) : null,
    perks: perks ?? [],
    rounds: normalizeList(rounds),
    faqs: sanitizeFaqs(faqs),
    skills: embeddedSkills,
    // A job always starts as a draft: publishing is its own action, so a half-written post can
    // never be listed by accident.
    status: 'DRAFT',
    publishedAt: null,
    createdBy: userId,
    updatedBy: userId,
    ...searchFields({ ...rest, companyName: profile.companyName, skills: embeddedSkills, rounds, faqs }),
  });
  return getAdmin(db, String(doc._id), userId);
}

export async function update(db, id, patch, userId) {
  const existing = await repo.findForHr(db, id, userId);
  if (!existing) throw AppError.notFound('Job');

  // Ranges are validated against the merged document, so patching one end cannot invert the pair.
  const merged = { ...existing, ...patch };
  if (merged.salaryMin != null && merged.salaryMax != null && merged.salaryMax < merged.salaryMin) {
    throw AppError.validation([{ field: 'salaryMax', message: 'Maximum salary must be at least the minimum' }]);
  }
  if (merged.minExperienceYears != null && merged.maxExperienceYears != null && merged.maxExperienceYears < merged.minExperienceYears) {
    throw AppError.validation([{ field: 'maxExperienceYears', message: 'Maximum experience must be at least the minimum' }]);
  }
  if (patch.categoryId) await assertCategory(db, patch.categoryId, 'OPPORTUNITY');
  if (patch.bannerId) await assertBanner(db, patch.bannerId);

  const { skills, slug, description, responsibilities, requirements, perks, rounds, faqs, status, publishedAt, ...rest } = patch;
  const set = { ...rest, updatedBy: userId };
  // The HR routes are the only writer, and they never accept a status — publishing has its own
  // action. Dropping them here keeps that true even if a body someday carries one.
  delete set.status;
  delete set.publishedAt;
  if (slug !== undefined) set.slug = await resolveSlug(db.Job, { explicit: slug, from: '', excludeId: id });
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (responsibilities !== undefined) set.responsibilities = responsibilities ? sanitizeRichText(responsibilities) : null;
  if (requirements !== undefined) set.requirements = requirements ? sanitizeRichText(requirements) : null;
  if (perks !== undefined) set.perks = perks;
  if (rounds !== undefined) set.rounds = normalizeList(rounds);
  if (faqs !== undefined) set.faqs = sanitizeFaqs(faqs);
  if (skills) set.skills = await ensureTags(db, skills);

  // Search terms come from the merged document so they never drift.
  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.Job.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id, userId);
}

export async function setPublished(db, id, userId, published) {
  const existing = await repo.findForHr(db, id, userId);
  if (!existing) throw AppError.notFound('Job');
  await db.Job.updateOne(
    { _id: id },
    {
      $set: published
        ? { status: 'PUBLISHED', publishedAt: existing.publishedAt ?? new Date(), updatedBy: userId }
        : { status: 'DRAFT', updatedBy: userId },
    },
  );
  return getAdmin(db, id, userId);
}

export async function remove(db, id, userId) {
  const row = await db.Job.findOneAndDelete({ _id: id, hrUserId: userId }).select({ title: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Job');
  return { id, title: row.title, slug: row.slug };
}
