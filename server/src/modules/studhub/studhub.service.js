import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolvePublishFields } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import { ensureTags } from '../taxonomy/taxonomy.service.js';
import * as repo from './studhub.repository.js';

async function hydrate(db, rows) {
  const media = await loadMedia(db, rows.map((r) => r.thumbnailId));
  return { media };
}

function toPublic(row, h, detail) {
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    type: row.type,
    summary: row.summary,
    thumbnail: pick(h.media, row.thumbnailId),
    provider: row.provider,
    offer: row.offer,
    eligibility: row.eligibility,
    deadline: row.deadline,
    ...(detail ? { description: row.description, claimUrl: row.claimUrl } : {}),
    tags: (row.tags ?? []).map(({ name, slug }) => ({ name, slug })),
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
  if (!row) throw AppError.notFound('Benefit');
  return toPublic(row, await hydrate(db, [row]), true);
}

export async function toAdminList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toAdmin(r, h));
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Benefit');
  return toAdmin(row, await hydrate(db, [row]));
}

const searchFields = (d) => ({
  searchTerms: termsOf(d.title, d.summary, d.provider, d.offer, d.eligibility, ...d.tags.map((t) => t.name), d.description),
  titleTerms: termsOf(d.title, d.provider),
});

export async function create(db, input, actorId) {
  const { tags, slug, description, status, publishedAt, ...rest } = input;
  const embeddedTags = tags?.length ? await ensureTags(db, tags) : [];
  const cleanDescription = description ? sanitizeRichText(description) : null;
  const doc = await db.StudhubBenefit.create({
    ...rest,
    slug: await resolveSlug(db.StudhubBenefit, { explicit: slug, from: rest.title }),
    description: cleanDescription,
    tags: embeddedTags,
    ...resolvePublishFields({ status: status ?? 'DRAFT', publishedAt }),
    ...searchFields({ ...rest, description: cleanDescription, tags: embeddedTags }),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch, actorId) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Benefit');

  const { tags, slug, description, status, publishedAt, ...rest } = patch;
  const set = { ...rest, updatedBy: actorId, ...resolvePublishFields({ status, publishedAt }, existing) };
  if (slug !== undefined) set.slug = await resolveSlug(db.StudhubBenefit, { explicit: slug, from: '', excludeId: id });
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (tags) set.tags = await ensureTags(db, tags);

  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.StudhubBenefit.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setPublished(db, id, published, actorId, publishedAt) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Benefit');
  await db.StudhubBenefit.updateOne(
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
  const row = await db.StudhubBenefit.findByIdAndDelete(id).select({ title: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Benefit');
  return { id, title: row.title, slug: row.slug };
}
