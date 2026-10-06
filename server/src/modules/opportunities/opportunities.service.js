import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolvePublishFields } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import { assertCategory, categoryOf, ensureTags, loadCategories } from '../taxonomy/taxonomy.service.js';
import * as repo from './opportunities.repository.js';

async function hydrate(db, rows) {
  const [media, categories, partners, organizations] = await Promise.all([
    loadMedia(db, rows.flatMap((r) => [r.organizationLogoId, r.bannerId])),
    loadCategories(db, rows.map((r) => r.categoryId)),
    repo.partnersFor(db, rows.map((r) => r.partnerId)),
    repo.organizationsFor(db, rows.map((r) => r.organizationId)),
  ]);
  return { media, categories, partners, organizations };
}

/** Mirrors lifecycleFilter('open') in the repository. */
export function applicationStatus(row, at = new Date()) {
  const deadlineOk = !row.applicationDeadline || row.applicationDeadline > at;
  const notEnded = !row.endDate || row.endDate > at;
  return deadlineOk && notEnded ? 'OPEN' : 'CLOSED';
}

const skillsOf = (row) => (row.skills ?? []).map(({ name, slug }) => ({ name, slug }));

/** Questions ordered for display; each keeps its embedded _id so answers can reference it. */
export const questionsOf = (row) =>
  (row.applicationQuestions ?? [])
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((q) => ({
      id: String(q._id),
      label: q.label,
      type: q.type,
      required: !!q.required,
      options: q.options ?? [],
      displayOrder: q.displayOrder ?? 0,
    }));

/** Normalizes question input for persistence, defaulting displayOrder to array position. */
const normalizeQuestions = (qs) =>
  (qs ?? []).map((q, i) => ({
    label: q.label,
    type: q.type,
    required: q.required ?? false,
    options: q.options ?? [],
    displayOrder: q.displayOrder ?? i,
  }));

/** Same contract for the structured detail blocks — array position is the display order. */
const normalizeList = (items) => (items ?? []).map((it, i) => ({ ...it, displayOrder: it.displayOrder ?? i }));

const byOrder = (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0);

const orderedList = (rows) => (rows ?? []).slice().sort(byOrder);

/** Structured detail blocks as the public sees them (all default-safe for pre-existing rows). */
function detailBlocks(row) {
  return {
    rounds: orderedList(row.rounds).map((r) => ({
      title: r.title,
      description: r.description ?? null,
      startsAt: r.startsAt ?? null,
      endsAt: r.endsAt ?? null,
      mode: r.mode ?? null,
      location: r.location ?? null,
    })),
    timeline: orderedList(row.timeline).map((t) => ({
      label: t.label,
      date: t.date ?? null,
      description: t.description ?? null,
    })),
    prizes: orderedList(row.prizes).map((p) => ({
      title: p.title,
      description: p.description ?? null,
      rank: p.rank ?? null,
      value: p.value ?? null,
      currency: p.currency ?? null,
      quantity: p.quantity ?? null,
    })),
    faqs: orderedList(row.faqs).map((f) => ({ question: f.question, answer: f.answer ?? null })),
    contact: {
      name: row.contact?.name ?? null,
      designation: row.contact?.designation ?? null,
      email: row.contact?.email ?? null,
      phone: row.contact?.phone ?? null,
      website: row.contact?.website ?? null,
    },
    venue: row.venue ?? null,
  };
}

/** Public shape: an explicit allow-list — internal fields never leave the server. */
/** Phase 3 project-submission settings as the public sees them (no internal template ids). */
function submissionInfo(row) {
  const s = row.submissionSettings ?? {};
  return {
    acceptsProjects: !!s.acceptsProjects,
    deadline: s.deadline ?? row.applicationDeadline ?? row.endDate ?? null,
    guidelines: s.guidelines ?? null,
    requireRepository: !!s.requireRepository,
    requireDemo: !!s.requireDemo,
    requireVideo: !!s.requireVideo,
    requirePublished: !!s.requirePublished,
    minTeamSize: s.minTeamSize ?? null,
    maxTeamSize: s.maxTeamSize ?? null,
  };
}

async function assertTemplate(db, settings) {
  const id = settings?.evaluationTemplateId;
  if (id && !(await db.EvaluationTemplate.exists({ _id: id }))) {
    throw AppError.validation([{ field: 'submissionSettings.evaluationTemplateId', message: 'Unknown evaluation template' }]);
  }
}

function toPublic(row, h, detail) {
  const partnerId = idOf(row.partnerId);
  const orgId = idOf(row.organizationId);
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    type: row.type,
    organization: {
      name: row.organizationName,
      logo: pick(h.media, row.organizationLogoId),
      partner: partnerId ? (h.partners.get(partnerId) ?? null) : null,
      // A link to the public organizer page — slug only, never the internal id.
      slug: orgId ? (h.organizations.get(orgId)?.slug ?? null) : null,
      type: orgId ? (h.organizations.get(orgId)?.type ?? null) : null,
      verified: !!(orgId && h.organizations.has(orgId)),
    },
    shortDescription: row.shortDescription,
    ...(detail
      ? {
          description: row.description,
          eligibility: row.eligibility ?? null,
          prizeInformation: row.prizeInformation ?? null,
          applicationQuestions: questionsOf(row),
          projectSubmissions: submissionInfo(row),
          ...detailBlocks(row),
        }
      : { acceptsProjects: !!row.submissionSettings?.acceptsProjects }),
    category: categoryOf(h.categories, row.categoryId),
    location: row.location,
    mode: row.mode,
    applicationDeadline: row.applicationDeadline,
    startDate: row.startDate,
    endDate: row.endDate,
    applicationStatus: applicationStatus(row),
    externalUrl: row.externalUrl,
    banner: pick(h.media, row.bannerId),
    skills: skillsOf(row),
    featured: row.featured,
    publishedAt: row.publishedAt,
  };
}

function toAdmin(row, h) {
  return {
    ...toPublic(row, h, true),
    partnerId: idOf(row.partnerId),
    organizationLogoId: idOf(row.organizationLogoId),
    bannerId: idOf(row.bannerId),
    categoryId: idOf(row.categoryId),
    status: row.status,
    submissionSettings: { ...submissionInfo(row), evaluationTemplateId: idOf(row.submissionSettings?.evaluationTemplateId) },
    createdBy: idOf(row.createdBy),
    updatedBy: idOf(row.updatedBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function toPublicList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toPublic(r, h, false));
}

export async function getPublicBySlug(db, slug) {
  const row = await repo.findPublicBySlug(db, slug);
  if (!row) throw AppError.notFound('Opportunity');
  return toPublic(row, await hydrate(db, [row]), true);
}

export async function toAdminList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toAdmin(r, h));
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Opportunity');
  return toAdmin(row, await hydrate(db, [row]));
}

const searchFields = (d) => ({
  searchTerms: termsOf(
    d.title,
    d.organizationName,
    d.shortDescription,
    d.location,
    ...(d.skills ?? []).map((s) => s.name),
    // The structured blocks carry real prose ("Grand Finale", "Best use of AI") — without these
    // the new sections would be invisible to search, and the omission only shows up later.
    ...(d.rounds ?? []).map((r) => r.title),
    ...(d.rounds ?? []).map((r) => r.description),
    ...(d.prizes ?? []).map((p) => p.title),
    ...(d.prizes ?? []).map((p) => p.description),
    ...(d.faqs ?? []).map((f) => f.question),
    d.venue,
  ),
  titleTerms: termsOf(d.title),
});

/** A banner an organizer uploads must actually exist — nothing else validates the reference. */
async function assertBanner(db, bannerId) {
  if (bannerId && !(await db.MediaAsset.exists({ _id: bannerId }))) {
    throw AppError.validation([{ field: 'bannerId', message: 'Unknown image — upload it again' }]);
  }
}

/** FAQ answers are rich text; the other block descriptions are capped plain text. */
const sanitizeFaqs = (faqs) =>
  normalizeList(faqs).map((f) => ({ ...f, answer: f.answer ? sanitizeRichText(f.answer) : null }));

/**
 * `guidelines` is authored in a plain textarea but rendered as HTML inside the public page's
 * prose block, so it crosses the same trust boundary as description/eligibility and must be
 * sanitised like them. Without this any verified organizer could store a script tag and run it in
 * every visitor's browser. Honest plain text survives the allow-list unchanged.
 */
const sanitizeSettings = (settings) =>
  settings?.guidelines == null ? settings : { ...settings, guidelines: sanitizeRichText(settings.guidelines) };

export async function create(db, input, actorId) {
  const {
    skills,
    slug,
    description,
    eligibility,
    prizeInformation,
    applicationQuestions,
    rounds,
    timeline,
    prizes,
    faqs,
    status,
    publishedAt,
    ...rest
  } = input;
  await assertCategory(db, rest.categoryId, 'OPPORTUNITY');
  await assertBanner(db, rest.bannerId);
  await assertTemplate(db, rest.submissionSettings);
  const embeddedSkills = skills?.length ? await ensureTags(db, skills) : [];
  const doc = await db.Opportunity.create({
    ...rest,
    slug: await resolveSlug(db.Opportunity, { explicit: slug, from: rest.title }),
    description: description ? sanitizeRichText(description) : null,
    eligibility: eligibility ? sanitizeRichText(eligibility) : null,
    prizeInformation: prizeInformation ? sanitizeRichText(prizeInformation) : null,
    applicationQuestions: normalizeQuestions(applicationQuestions),
    rounds: normalizeList(rounds),
    timeline: normalizeList(timeline),
    prizes: normalizeList(prizes),
    faqs: sanitizeFaqs(faqs),
    submissionSettings: sanitizeSettings(rest.submissionSettings),
    skills: embeddedSkills,
    ...resolvePublishFields({ status: status ?? 'DRAFT', publishedAt }),
    ...searchFields({ ...rest, location: rest.location ?? null, skills: embeddedSkills, rounds, prizes, faqs }),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch, actorId) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Opportunity');

  const start = patch.startDate !== undefined ? patch.startDate : existing.startDate;
  const end = patch.endDate !== undefined ? patch.endDate : existing.endDate;
  if (start && end && end < start) {
    throw AppError.validation([{ field: 'endDate', message: 'End date must be on or after the start date' }]);
  }
  if (patch.categoryId) await assertCategory(db, patch.categoryId, 'OPPORTUNITY');
  if (patch.bannerId) await assertBanner(db, patch.bannerId);

  const {
    skills,
    slug,
    description,
    eligibility,
    prizeInformation,
    applicationQuestions,
    rounds,
    timeline,
    prizes,
    faqs,
    status,
    publishedAt,
    ...rest
  } = patch;
  const set = { ...rest, updatedBy: actorId, ...resolvePublishFields({ status, publishedAt }, existing) };
  if (slug !== undefined) set.slug = await resolveSlug(db.Opportunity, { explicit: slug, from: '', excludeId: id });
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (eligibility !== undefined) set.eligibility = eligibility ? sanitizeRichText(eligibility) : null;
  if (prizeInformation !== undefined) set.prizeInformation = prizeInformation ? sanitizeRichText(prizeInformation) : null;
  if (applicationQuestions !== undefined) set.applicationQuestions = normalizeQuestions(applicationQuestions);
  if (rounds !== undefined) set.rounds = normalizeList(rounds);
  if (timeline !== undefined) set.timeline = normalizeList(timeline);
  if (prizes !== undefined) set.prizes = normalizeList(prizes);
  if (faqs !== undefined) set.faqs = sanitizeFaqs(faqs);
  if (skills) set.skills = await ensureTags(db, skills);
  if (rest.contact !== undefined) {
    // Merge like submissionSettings, so editing one contact field does not wipe the others.
    set.contact = { ...(existing.contact ?? {}), ...rest.contact };
  }
  if (rest.submissionSettings !== undefined) {
    await assertTemplate(db, rest.submissionSettings);
    // Partial settings merge into what's there (so toggling one flag doesn't reset the rest).
    set.submissionSettings = { ...(existing.submissionSettings ?? {}), ...sanitizeSettings(rest.submissionSettings) };
  }

  // Search terms are derived from the merged document so they never drift.
  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.Opportunity.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setPublished(db, id, published, actorId, publishedAt) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Opportunity');
  await db.Opportunity.updateOne(
    { _id: id },
    {
      $set: published
        ? { status: 'PUBLISHED', publishedAt: publishedAt ?? existing.publishedAt ?? new Date(), updatedBy: actorId }
        : { status: 'DRAFT', updatedBy: actorId },
    },
  );
  return getAdmin(db, id);
}

export async function remove(db, id) {
  const row = await db.Opportunity.findByIdAndDelete(id).select({ title: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Opportunity');
  return { id, title: row.title, slug: row.slug };
}
