import { AppError } from '../../common/errors/app-error.js';

// Resumes are private to their owner. Every read/write is scoped by userId so one
// user can never see or mutate another's resume; a miss is a 404 (we don't reveal
// whether an id exists for someone else).

function serialize(row) {
  return {
    id: String(row._id),
    title: row.title,
    template: row.template ?? 'classic',
    fullName: row.fullName ?? null,
    headline: row.headline ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    location: row.location ?? null,
    links: {
      github: row.links?.github ?? null,
      linkedin: row.links?.linkedin ?? null,
      portfolio: row.links?.portfolio ?? null,
      website: row.links?.website ?? null,
    },
    summary: row.summary ?? null,
    experience: row.experience ?? [],
    education: row.education ?? [],
    projects: row.projects ?? [],
    skills: row.skills ?? [],
    certifications: row.certifications ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// The list view is a lightweight summary — enough to render a picker without
// shipping every section of every resume.
function serializeSummary(row) {
  return {
    id: String(row._id),
    title: row.title,
    template: row.template ?? 'classic',
    fullName: row.fullName ?? null,
    headline: row.headline ?? null,
    updatedAt: row.updatedAt,
  };
}

export async function list(db, userId, { page, pageSize }) {
  const filter = { userId };
  const [rows, total] = await Promise.all([
    db.Resume.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Resume.countDocuments(filter),
  ]);
  return { items: rows.map(serializeSummary), total };
}

export async function get(db, userId, id) {
  const row = await db.Resume.findOne({ _id: id, userId }).lean();
  if (!row) throw AppError.notFound('Resume');
  return serialize(row);
}

export async function create(db, userId, body) {
  const doc = await db.Resume.create({ ...body, userId });
  return serialize(doc.toObject());
}

export async function update(db, userId, id, patch) {
  const row = await db.Resume.findOneAndUpdate(
    { _id: id, userId },
    { $set: patch },
    { new: true, runValidators: true },
  ).lean();
  if (!row) throw AppError.notFound('Resume');
  return serialize(row);
}

export async function remove(db, userId, id) {
  const row = await db.Resume.findOneAndDelete({ _id: id, userId }).select({ _id: 1 }).lean();
  if (!row) throw AppError.notFound('Resume');
  return { id };
}
