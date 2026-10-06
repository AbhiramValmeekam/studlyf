import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { escapeRegex, slugify } from '../../common/utilities/text.js';

/** Validates that a category id exists *and* belongs to the expected content scope. */
export async function assertCategory(db, id, scope) {
  if (!id) return;
  if (!(await db.Category.exists({ _id: id, scope }))) {
    throw AppError.validation([{ field: 'categoryId', message: `Unknown ${scope.toLowerCase()} category` }]);
  }
}

/** Resolves a public `?category=<slug>` filter to an id (or a never-matching sentinel). */
export async function categoryIdBySlug(db, scope, slug) {
  const row = await db.Category.findOne({ scope, slug }).select({ _id: 1 }).lean();
  return row?._id ?? null;
}

export async function loadCategories(
  db,
  ids,
) {
  const unique = [...new Set(ids.map(idOf).filter((v) => !!v))];
  if (!unique.length) return new Map();
  const rows = await db.Category.find({ _id: { $in: unique } }).select({ name: 1, slug: 1 }).lean();
  return new Map(rows.map((r) => [String(r._id), { id: String(r._id), name: r.name, slug: r.slug }]));
}

export const categoryOf = (map, id) => {
  const key = idOf(id);
  return key ? (map.get(key) ?? null) : null;
};

export async function listCategories(db, scope) {
  const rows = await db.Category.find(scope ? { scope } : {})
    .sort({ scope: 1, displayOrder: 1, name: 1 })
    .lean();
  return rows.map((c) => ({
    id: String(c._id),
    scope: c.scope,
    name: c.name,
    slug: c.slug,
    description: c.description,
    displayOrder: c.displayOrder,
  }));
}

/**
 * Upserts tags into the master vocabulary and returns the `{ name, slug }` copies that
 * content documents embed (skills on opportunities, tags on resources).
 */
export async function ensureTags(db, names) {
  const bySlug = new Map();
  for (const name of names) {
    const clean = name.trim();
    if (clean) bySlug.set(slugify(clean), clean);
  }
  if (!bySlug.size) return [];
  await db.Tag.bulkWrite(
    [...bySlug].map(([slug, name]) => ({
      updateOne: { filter: { slug }, update: { $setOnInsert: { slug, name } }, upsert: true },
    })),
  );
  const rows = await db.Tag.find({ slug: { $in: [...bySlug.keys()] } }).select({ name: 1, slug: 1 }).lean();
  return rows.map((t) => ({ name: t.name, slug: t.slug })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTags(db, q) {
  const rows = await db.Tag.find(q ? { name: { $regex: escapeRegex(q), $options: 'i' } } : {})
    .sort({ name: 1 })
    .limit(200)
    .lean();
  return rows.map((t) => ({ id: String(t._id), name: t.name, slug: t.slug }));
}

/** Removes a tag from the vocabulary and from every document that embeds it. */
export async function deleteTag(db, id) {
  const tag = await db.Tag.findByIdAndDelete(id).lean();
  if (!tag) return null;
  await Promise.all([
    db.Opportunity.updateMany({ 'skills.slug': tag.slug }, { $pull: { skills: { slug: tag.slug } } }),
    db.Resource.updateMany({ 'tags.slug': tag.slug }, { $pull: { tags: { slug: tag.slug } } }),
  ]);
  return tag;
}
