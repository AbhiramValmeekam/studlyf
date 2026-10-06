import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolvePublishFields } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import { assertCategory, categoryOf, ensureTags, loadCategories } from '../taxonomy/taxonomy.service.js';
import * as repo from './resources.repository.js';

async function hydrate(db, rows) {
  const [media, categories] = await Promise.all([
    loadMedia(db, rows.map((r) => r.thumbnailId)),
    loadCategories(db, rows.map((r) => r.categoryId)),
  ]);
  return { media, categories };
}

function toPublic(row, h, detail) {
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    type: row.type,
    description: row.description,
    thumbnail: pick(h.media, row.thumbnailId),
    category: categoryOf(h.categories, row.categoryId),
    ...(detail ? { content: row.content } : {}),
    externalUrl: row.externalUrl,
    author: row.authorName ? { name: row.authorName } : null,
    tags: (row.tags ?? []).map(({ name, slug }) => ({ name, slug })),
    featured: row.featured,
    publishedAt: row.publishedAt,
  };
}

function toAdmin(row, h) {
  return {
    ...toPublic(row, h, true),
    thumbnailId: idOf(row.thumbnailId),
    categoryId: idOf(row.categoryId),
    authorName: row.authorName,
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
  if (!row) throw AppError.notFound('Resource');
  return toPublic(row, await hydrate(db, [row]), true);
}

export async function toAdminList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toAdmin(r, h));
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Resource');
  return toAdmin(row, await hydrate(db, [row]));
}

const searchFields = (d) => ({
  searchTerms: termsOf(d.title, d.description, d.authorName, ...d.tags.map((t) => t.name), d.content),
  titleTerms: termsOf(d.title),
});

export async function create(db, input, actorId) {
  const { tags, slug, content, status, publishedAt, ...rest } = input;
  await assertCategory(db, rest.categoryId, 'RESOURCE');
  const embeddedTags = tags?.length ? await ensureTags(db, tags) : [];
  const cleanContent = content ? sanitizeRichText(content) : null;
  const doc = await db.Resource.create({
    ...rest,
    slug: await resolveSlug(db.Resource, { explicit: slug, from: rest.title }),
    content: cleanContent,
    tags: embeddedTags,
    ...resolvePublishFields({ status: status ?? 'DRAFT', publishedAt }),
    ...searchFields({ ...rest, authorName: rest.authorName ?? null, content: cleanContent, tags: embeddedTags }),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch, actorId) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Resource');
  if (patch.categoryId) await assertCategory(db, patch.categoryId, 'RESOURCE');

  const { tags, slug, content, status, publishedAt, ...rest } = patch;
  const set = { ...rest, updatedBy: actorId, ...resolvePublishFields({ status, publishedAt }, existing) };
  if (slug !== undefined) set.slug = await resolveSlug(db.Resource, { explicit: slug, from: '', excludeId: id });
  if (content !== undefined) set.content = content ? sanitizeRichText(content) : null;
  if (tags) set.tags = await ensureTags(db, tags);

  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.Resource.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setPublished(db, id, published, actorId, publishedAt) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Resource');
  await db.Resource.updateOne(
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
  const row = await db.Resource.findByIdAndDelete(id).select({ title: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Resource');
  return { id, title: row.title, slug: row.slug };
}
