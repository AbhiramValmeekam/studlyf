import { escapeRegex } from '../../common/utilities/text.js';

function nameFilter(q) {
  return q ? { name: { $regex: escapeRegex(q), $options: 'i' } } : {};
}

export async function listActive(db, { q, page, pageSize }) {
  const filter = { active: true, ...nameFilter(q) };
  const [rows, total] = await Promise.all([
    db.Skill.find(filter).sort({ name: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Skill.countDocuments(filter),
  ]);
  return { rows, total };
}

export async function listAll(db, { q, active, page, pageSize }) {
  const filter = { ...nameFilter(q) };
  if (active !== undefined) filter.active = active;
  const [rows, total] = await Promise.all([
    db.Skill.find(filter).sort({ name: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Skill.countDocuments(filter),
  ]);
  return { rows, total };
}

export async function findById(db, id) {
  return db.Skill.findById(id).lean();
}

/** Look up active skills by slug — used to validate/embed skills onto a builder profile. */
export async function findActiveBySlugs(db, slugs) {
  const unique = [...new Set(slugs.map((s) => s.toLowerCase()))];
  if (!unique.length) return [];
  return db.Skill.find({ slug: { $in: unique }, active: true }).select({ name: 1, slug: 1 }).lean();
}
