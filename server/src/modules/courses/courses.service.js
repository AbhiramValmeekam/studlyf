import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolvePublishFields } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import { ensureTags } from '../taxonomy/taxonomy.service.js';
import * as repo from './courses.repository.js';

async function hydrate(db, rows) {
  const media = await loadMedia(db, rows.map((r) => r.thumbnailId));
  return { media };
}

function normalizeModules(modules) {
  return (modules ?? []).map((m, i) => ({
    title: m.title,
    summary: m.summary ?? null,
    displayOrder: m.displayOrder ?? i,
    lessons: (m.lessons ?? []).map((l, j) => ({
      title: l.title,
      kind: l.kind ?? 'READING',
      durationMinutes: l.durationMinutes ?? null,
      url: l.url ?? null,
      displayOrder: l.displayOrder ?? j,
    })),
  }));
}

function moduleView(m) {
  return {
    title: m.title,
    summary: m.summary,
    displayOrder: m.displayOrder,
    lessons: [...(m.lessons ?? [])]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((l) => ({ title: l.title, kind: l.kind, durationMinutes: l.durationMinutes, url: l.url })),
  };
}

function toPublic(row, h, detail) {
  const modules = [...(row.modules ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const lessonCount = modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    audience: row.audience,
    level: row.level,
    summary: row.summary,
    thumbnail: pick(h.media, row.thumbnailId),
    provider: row.provider,
    role: row.role,
    durationHours: row.durationHours,
    skills: (row.skills ?? []).map(({ name, slug }) => ({ name, slug })),
    moduleCount: modules.length,
    lessonCount,
    ...(detail
      ? { description: row.description, enrollUrl: row.enrollUrl, modules: modules.map(moduleView) }
      : {}),
    featured: row.featured,
    publishedAt: row.publishedAt,
  };
}

function toAdmin(row, h) {
  return {
    ...toPublic(row, h, true),
    thumbnailId: idOf(row.thumbnailId),
    status: row.status,
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
  if (!row) throw AppError.notFound('Course');
  return toPublic(row, await hydrate(db, [row]), true);
}

export async function toAdminList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toAdmin(r, h));
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Course');
  return toAdmin(row, await hydrate(db, [row]));
}

const searchFields = (d) => ({
  searchTerms: termsOf(
    d.title,
    d.summary,
    d.description,
    d.provider,
    d.role,
    ...(d.skills ?? []).map((s) => s.name),
    ...(d.modules ?? []).map((m) => m.title),
  ),
  titleTerms: termsOf(d.title),
});

export async function create(db, input, actorId) {
  const { skills, slug, description, modules, status, publishedAt, ...rest } = input;
  const embeddedSkills = skills?.length ? await ensureTags(db, skills) : [];
  const cleanDescription = description ? sanitizeRichText(description) : null;
  const normModules = normalizeModules(modules);
  const doc = await db.Course.create({
    ...rest,
    slug: await resolveSlug(db.Course, { explicit: slug, from: rest.title }),
    description: cleanDescription,
    skills: embeddedSkills,
    modules: normModules,
    ...resolvePublishFields({ status: status ?? 'DRAFT', publishedAt }),
    ...searchFields({ ...rest, description: cleanDescription, skills: embeddedSkills, modules: normModules }),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch, actorId) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Course');

  const { skills, slug, description, modules, status, publishedAt, ...rest } = patch;
  const set = { ...rest, updatedBy: actorId, ...resolvePublishFields({ status, publishedAt }, existing) };
  if (slug !== undefined) set.slug = await resolveSlug(db.Course, { explicit: slug, from: '', excludeId: id });
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (skills) set.skills = await ensureTags(db, skills);
  if (modules) set.modules = normalizeModules(modules);

  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.Course.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setPublished(db, id, published, actorId, publishedAt) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Course');
  await db.Course.updateOne(
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
  const row = await db.Course.findByIdAndDelete(id).select({ title: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Course');
  return { id, title: row.title, slug: row.slug };
}
