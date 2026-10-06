import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { escapeRegex } from '../../common/utilities/text.js';
import { idOf } from '../../common/utilities/media.js';
import { weightTotal } from './scoring.js';

/**
 * Evaluation templates (rubrics). Nothing is hard-coded: admins create criteria, set max scores
 * and weights, reorder (array order = display order) and activate. An ACTIVE template must have
 * at least one criterion and weights totalling exactly 100% — the only kind evaluators can use.
 * Criteria keep their _id across edits (pass `id`) so the rubric's identity is stable.
 */
function validate(criteria, active) {
  const errors = [];
  const names = new Set();
  criteria.forEach((c, i) => {
    const key = c.name.trim().toLowerCase();
    if (names.has(key)) errors.push({ field: `criteria.${i}.name`, message: 'Each criterion needs a distinct name' });
    names.add(key);
  });
  if (active) {
    if (!criteria.length) errors.push({ field: 'criteria', message: 'Add at least one criterion before activating the template' });
    const total = weightTotal(criteria);
    if (criteria.length && Math.abs(total - 100) > 0.001) {
      errors.push({ field: 'criteria', message: `Criteria weights must add up to 100% (currently ${total}%).` });
    }
  }
  if (errors.length) throw AppError.validation(errors, errors.find((e) => e.field === 'criteria')?.message ?? 'Check the template criteria.');
}

function normalize(input, existing) {
  const known = new Set((existing?.criteria ?? []).map((c) => String(c._id)));
  return input.map((c, order) => ({
    _id: c.id && known.has(c.id) ? new mongoose.Types.ObjectId(c.id) : new mongoose.Types.ObjectId(),
    name: c.name,
    description: c.description ?? null,
    maxScore: c.maxScore,
    weight: c.weight,
    order,
    required: c.required ?? true,
  }));
}

async function assertOpportunity(db, opportunityId) {
  if (opportunityId && !(await db.Opportunity.exists({ _id: opportunityId }))) {
    throw AppError.validation([{ field: 'opportunityId', message: 'Unknown opportunity' }]);
  }
}

export async function toView(db, rows) {
  const ids = rows.map((r) => r._id);
  const [usage, opps] = await Promise.all([
    ids.length ? db.Evaluation.aggregate([{ $match: { templateId: { $in: ids } } }, { $group: { _id: '$templateId', n: { $sum: 1 } } }]) : [],
    db.Opportunity.find({ _id: { $in: rows.map((r) => r.opportunityId).filter(Boolean) } }).select({ title: 1, slug: 1 }).lean(),
  ]);
  const usageMap = new Map(usage.map((u) => [String(u._id), u.n]));
  const oppMap = new Map(opps.map((o) => [String(o._id), { id: String(o._id), title: o.title, slug: o.slug }]));
  return rows.map((t) => ({
    id: String(t._id),
    name: t.name,
    description: t.description ?? null,
    organizationId: idOf(t.organizationId),
    opportunity: t.opportunityId ? (oppMap.get(String(t.opportunityId)) ?? null) : null,
    isActive: t.isActive,
    criteria: (t.criteria ?? []).map((c) => ({
      id: String(c._id),
      name: c.name,
      description: c.description ?? null,
      maxScore: c.maxScore,
      weight: c.weight,
      order: c.order,
      required: c.required,
    })),
    totalWeight: weightTotal(t.criteria ?? []),
    usage: { evaluations: usageMap.get(String(t._id)) ?? 0 },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

const one = async (db, id) => (await toView(db, [await getRow(db, id)]))[0];

async function getRow(db, id) {
  const row = await db.EvaluationTemplate.findById(id).lean();
  if (!row) throw AppError.notFound('Evaluation template');
  return row;
}

export async function list(db, { q, active, page, pageSize }) {
  const filter = {};
  if (active !== undefined) filter.isActive = active;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const [rows, total] = await Promise.all([
    db.EvaluationTemplate.find(filter).sort({ isActive: -1, name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.EvaluationTemplate.countDocuments(filter),
  ]);
  return { items: await toView(db, rows), total };
}

export const get = (db, id) => one(db, id);

export async function create(db, adminId, input) {
  const criteria = normalize(input.criteria ?? []);
  validate(criteria, !!input.isActive);
  await assertOpportunity(db, input.opportunityId);
  const doc = await db.EvaluationTemplate.create({
    name: input.name,
    description: input.description ?? null,
    opportunityId: input.opportunityId ?? null,
    isActive: !!input.isActive,
    criteria,
    createdBy: adminId,
    updatedBy: adminId,
  });
  return one(db, doc._id);
}

export async function update(db, adminId, id, patch) {
  const existing = await getRow(db, id);
  const set = { updatedBy: adminId };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.opportunityId !== undefined) {
    await assertOpportunity(db, patch.opportunityId);
    set.opportunityId = patch.opportunityId ?? null;
  }
  if (patch.criteria !== undefined) set.criteria = normalize(patch.criteria, existing);
  if (patch.isActive !== undefined) set.isActive = patch.isActive;
  validate(set.criteria ?? existing.criteria ?? [], set.isActive ?? existing.isActive);
  await db.EvaluationTemplate.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return one(db, id);
}

export async function setActive(db, adminId, id, isActive) {
  const existing = await getRow(db, id);
  validate(existing.criteria ?? [], isActive);
  await db.EvaluationTemplate.updateOne({ _id: id }, { $set: { isActive, updatedBy: adminId } });
  return one(db, id);
}

/** Templates that have scored work are history — deactivate them instead of deleting. */
export async function remove(db, id) {
  const existing = await getRow(db, id);
  if (await db.Evaluation.exists({ templateId: existing._id })) {
    throw new AppError('CONFLICT', 'This template has already been used for evaluations — deactivate it instead.');
  }
  await db.Opportunity.updateMany({ 'submissionSettings.evaluationTemplateId': existing._id }, { $set: { 'submissionSettings.evaluationTemplateId': null } });
  await db.EvaluationTemplate.deleteOne({ _id: existing._id });
  return { id, name: existing.name };
}
