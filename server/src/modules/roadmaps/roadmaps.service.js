import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { resolvePublishFields } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import * as repo from './roadmaps.repository.js';

const PRIORITY_ORDER = { CORE: 0, IMPORTANT: 1, OPTIONAL: 2 };
const PRIORITIES = ['CORE', 'IMPORTANT', 'OPTIONAL'];

// ---- templates -----------------------------------------------------------------------

const stepOut = (s) => ({
  skillSlug: s.skillSlug,
  skillName: s.skillName,
  priority: s.priority ?? 'CORE',
  rationale: s.rationale ?? null,
  resourceSlug: s.resourceSlug ?? null,
});

/** How many steps of each priority — enough for a card to read "6 core skills" without the list. */
const countsOf = (steps) =>
  Object.fromEntries(PRIORITIES.map((p) => [p, steps.filter((s) => (s.priority ?? 'CORE') === p).length]));

function toPublic(row, detail) {
  const steps = (row.steps ?? []).map(stepOut).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return {
    id: String(row._id),
    role: row.role,
    slug: row.slug,
    roleFamily: row.roleFamily ?? null,
    summary: row.summary,
    stepCount: steps.length,
    stepCounts: countsOf(steps),
    featured: row.featured,
    publishedAt: row.publishedAt,
    ...(detail ? { description: row.description ?? null, demandNote: row.demandNote ?? null, steps } : {}),
  };
}

function toAdmin(row) {
  return {
    ...toPublic(row, true),
    status: row.status,
    createdBy: idOf(row.createdBy),
    updatedBy: idOf(row.updatedBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function toPublicList(db, rows) {
  return rows.map((r) => toPublic(r, false));
}

export async function getPublicBySlug(db, slug) {
  const row = await repo.findPublicBySlug(db, slug);
  if (!row) throw AppError.notFound('Roadmap');
  return toPublic(row, true);
}

export async function toAdminList(db, rows) {
  return rows.map(toAdmin);
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Roadmap');
  return toAdmin(row);
}

const searchFields = (d) => ({
  searchTerms: termsOf(d.role, d.roleFamily, d.summary, d.description, ...(d.steps ?? []).map((s) => s.skillName)),
  titleTerms: termsOf(d.role),
});

const normalizeSteps = (steps) => (steps ?? []).map((s) => stepOut(s));

export async function create(db, input, actorId) {
  const { slug, description, steps, status, publishedAt, ...rest } = input;
  const cleanDescription = description ? sanitizeRichText(description) : null;
  const normSteps = normalizeSteps(steps);
  const doc = await db.RoadmapTemplate.create({
    ...rest,
    slug: await resolveSlug(db.RoadmapTemplate, { explicit: slug, from: rest.role }),
    description: cleanDescription,
    steps: normSteps,
    ...resolvePublishFields({ status: status ?? 'DRAFT', publishedAt }),
    ...searchFields({ ...rest, description: cleanDescription, steps: normSteps }),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch, actorId) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Roadmap');
  const { slug, description, steps, status, publishedAt, ...rest } = patch;
  const set = { ...rest, updatedBy: actorId, ...resolvePublishFields({ status, publishedAt }, existing) };
  if (slug !== undefined) set.slug = await resolveSlug(db.RoadmapTemplate, { explicit: slug, from: '', excludeId: id });
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (steps) set.steps = normalizeSteps(steps);
  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.RoadmapTemplate.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setPublished(db, id, published, actorId, publishedAt) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Roadmap');
  await db.RoadmapTemplate.updateOne(
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
  const row = await db.RoadmapTemplate.findByIdAndDelete(id).select({ role: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Roadmap');
  // A person's goal outlives the template — their plan simply stops resolving.
  await db.UserRoadmap.deleteMany({ templateId: id });
  return { id, role: row.role, slug: row.slug };
}

// ---- the person's plan ------------------------------------------------------------------

/** The skill slugs on someone's builder profile — the half of the diff that isn't hand-marked. */
async function profileSkillSlugs(db, userId) {
  const profile = await db.BuilderProfile.findOne({ userId }).select({ skills: 1 }).lean();
  return new Set((profile?.skills ?? []).map((s) => String(s.slug).toLowerCase()));
}

function planOf(template, mine, have) {
  const marked = new Set((mine?.completedSkillSlugs ?? []).map((s) => String(s).toLowerCase()));
  const steps = (template.steps ?? [])
    .map(stepOut)
    .map((s) => {
      // Evidence on the profile beats a checkbox: a skill the builder has already listed is done
      // whether or not they ticked it, and unticking it here can't un-list it there.
      const fromProfile = have.has(s.skillSlug.toLowerCase());
      const doneByHand = marked.has(s.skillSlug.toLowerCase());
      return { ...s, done: fromProfile || doneByHand, source: fromProfile ? 'PROFILE' : doneByHand ? 'MARKED' : null };
    })
    .sort(
      (a, b) =>
        // Priority order is the plan's spine; within a priority, what's still missing comes first
        // so the page opens on the next thing to learn rather than on a wall of ticks.
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        Number(a.done) - Number(b.done) ||
        a.skillName.localeCompare(b.skillName),
    );

  const complete = steps.filter((s) => s.done).length;
  const total = steps.length;
  return {
    goal: {
      roleSlug: template.slug,
      role: template.role,
      roleFamily: template.roleFamily ?? null,
      summary: template.summary,
      demandNote: template.demandNote ?? null,
      targetDate: mine?.targetDate ?? null,
      startedAt: mine?.startedAt ?? null,
    },
    progress: {
      total,
      complete,
      percent: total ? Math.round((complete / total) * 100) : 0,
      byPriority: Object.fromEntries(
        PRIORITIES.map((p) => {
          const list = steps.filter((s) => s.priority === p);
          return [p, { total: list.length, complete: list.filter((s) => s.done).length }];
        }),
      ),
      // What to learn next: the unmet CORE skills, in template order.
      nextSteps: steps.filter((s) => !s.done && s.priority === 'CORE').slice(0, 3),
    },
    steps,
  };
}

/** Published roles for the "pick a goal" state, so an empty roadmap is never a dead end. */
async function suggestions(db, limit = 4) {
  const { rows } = await repo.listPublic(db, { page: 1, pageSize: limit, featured: true });
  const list = rows.length ? rows : (await repo.listPublic(db, { page: 1, pageSize: limit })).rows;
  return list.map((r) => toPublic(r, false));
}

export async function getMine(db, userId) {
  const mine = await repo.findMine(db, userId);
  if (!mine) return { plan: null, suggestedRoles: await suggestions(db) };

  const template = await repo.findBySlug(db, mine.roleSlug);
  // A retired template leaves the goal in place but nothing to render — treat it as no goal,
  // keeping the choices so republishing the template brings the plan back intact.
  if (!template) return { plan: null, suggestedRoles: await suggestions(db) };

  return { plan: planOf(template, mine, await profileSkillSlugs(db, userId)) };
}

export async function setGoal(db, userId, { roleSlug, targetDate }) {
  const template = await repo.findPublicBySlug(db, roleSlug);
  if (!template) throw AppError.notFound('Roadmap');
  const existing = await repo.findMine(db, userId);

  const set = { templateId: template._id, roleSlug: template.slug, targetDate: targetDate ?? null };
  // Re-picking the role you already hold is just a new target date; checkmarks survive. Moving to
  // a different role starts clean — the old ticks name skills the new plan never asked for.
  if (existing && existing.roleSlug !== template.slug) set.completedSkillSlugs = [];

  await db.UserRoadmap.updateOne(
    { userId },
    { $set: set, $setOnInsert: { startedAt: new Date() } },
    { upsert: true, runValidators: true },
  );
  return getMine(db, userId);
}

export async function clearGoal(db, userId) {
  await db.UserRoadmap.deleteOne({ userId });
  return getMine(db, userId);
}

export async function setStepDone(db, userId, skillSlug, done) {
  const mine = await repo.findMine(db, userId);
  if (!mine) throw AppError.notFound('Roadmap');
  const template = await repo.findBySlug(db, mine.roleSlug);
  const slug = String(skillSlug).toLowerCase();
  const step = (template?.steps ?? []).find((s) => s.skillSlug.toLowerCase() === slug);
  if (!step) throw AppError.validation([{ field: 'skillSlug', message: 'That skill is not a step in your roadmap.' }]);

  const update = done ? { $addToSet: { completedSkillSlugs: step.skillSlug } } : { $pull: { completedSkillSlugs: { $in: [step.skillSlug, slug] } } };
  await db.UserRoadmap.updateOne({ userId }, update);
  return getMine(db, userId);
}
