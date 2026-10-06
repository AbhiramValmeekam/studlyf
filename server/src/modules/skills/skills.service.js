import { AppError } from '../../common/errors/app-error.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import * as repo from './skills.repository.js';

function toPublic(row) {
  return { id: String(row._id), name: row.name, slug: row.slug, category: row.category ?? null };
}

function toAdmin(row) {
  return {
    ...toPublic(row),
    description: row.description ?? null,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPublic(db, query) {
  const { rows, total } = await repo.listActive(db, query);
  return { items: rows.map(toPublic), total };
}

export async function listAdmin(db, query) {
  const { rows, total } = await repo.listAll(db, query);
  return { items: rows.map(toAdmin), total };
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Skill');
  return toAdmin(row);
}

export async function create(db, input) {
  const { name, slug, ...rest } = input;
  const doc = await db.Skill.create({
    name,
    slug: await resolveSlug(db.Skill, { explicit: slug, from: name }),
    ...rest,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Skill');
  const { slug, ...rest } = patch;
  const set = { ...rest };
  if (slug !== undefined) {
    set.slug = await resolveSlug(db.Skill, { explicit: slug, from: patch.name ?? existing.name, excludeId: id });
  }
  if (Object.keys(set).length) await db.Skill.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setActive(db, id, active) {
  const { matchedCount } = await db.Skill.updateOne({ _id: id }, { $set: { active } });
  if (!matchedCount) throw AppError.notFound('Skill');
  return getAdmin(db, id);
}

export async function remove(db, id) {
  const row = await db.Skill.findByIdAndDelete(id).lean();
  if (!row) throw AppError.notFound('Skill');
  return { id, name: row.name, slug: row.slug };
}
