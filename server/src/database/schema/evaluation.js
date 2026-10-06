import { Schema } from 'mongoose';
import { EVALUATION_STATUSES, FEEDBACK_VISIBILITIES } from './enums.js';

const { ObjectId } = Schema.Types;

/**
 * Spec model "EvaluationCriterion" → embedded `evaluation_templates.criteria[]` (always read and
 * edited together; the array order is the display order, mirrored into `order`). Each criterion
 * keeps its own `_id` so evaluations can refer back to it.
 */
const criterionSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: null },
  maxScore: { type: Number, required: true, min: 1 },
  weight: { type: Number, required: true, min: 0, max: 100 }, // percent; an active template sums to 100
  order: { type: Number, required: true, default: 0 },
  required: { type: Boolean, required: true, default: true },
});

/**
 * A reusable scoring rubric. Admins build these (no hard-coded criteria). An active template
 * must have at least one criterion and weights totalling exactly 100%.
 * `organizationId` is reserved for Phase 4 organizer-owned rubrics; `opportunityId` scopes a
 * template to one opportunity (null = reusable across opportunities).
 */
export const evaluationTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    organizationId: { type: ObjectId, default: null },
    opportunityId: { type: ObjectId, ref: 'Opportunity', default: null },
    isActive: { type: Boolean, required: true, default: false },
    criteria: { type: [criterionSchema], default: () => [] },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { collection: 'evaluation_templates', timestamps: true },
);
evaluationTemplateSchema.index({ isActive: 1, name: 1 });
evaluationTemplateSchema.index({ opportunityId: 1 });
evaluationTemplateSchema.index({ organizationId: 1 });

/**
 * Spec model "EvaluationScore" → embedded `evaluations.scores[]`. Each row carries a SNAPSHOT of
 * its criterion (name, max, weight) taken at assignment, plus the raw and weighted score, so a
 * later template edit can never rewrite a completed evaluation.
 *   weightedScore = score / maxScore × weight        overallScore = Σ weightedScore (0–100)
 */
const scoreSchema = new Schema(
  {
    criterionId: { type: ObjectId, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    maxScore: { type: Number, required: true },
    weight: { type: Number, required: true },
    required: { type: Boolean, required: true, default: true },
    order: { type: Number, required: true, default: 0 },
    score: { type: Number, default: null },
    weightedScore: { type: Number, default: null },
    feedback: { type: String, default: null },
    feedbackVisibility: { type: String, enum: FEEDBACK_VISIBILITIES, required: true, default: 'BUILDER_VISIBLE' },
  },
  { _id: false },
);

/**
 * One evaluator's review of one project submission. Completed evaluations are immutable.
 * Visibility: scores and feedback default to BUILDER_VISIBLE (never PUBLIC by default);
 * `internalNotes` are always INTERNAL; the evaluator's identity is hidden unless they opt in.
 */
export const evaluationSchema = new Schema(
  {
    submissionId: { type: ObjectId, ref: 'ProjectSubmission', required: true },
    projectId: { type: ObjectId, ref: 'Project', required: true },
    opportunityId: { type: ObjectId, ref: 'Opportunity', required: true },
    evaluatorId: { type: ObjectId, ref: 'User', required: true },
    templateId: { type: ObjectId, ref: 'EvaluationTemplate', required: true },
    templateName: { type: String, required: true },
    status: { type: String, enum: EVALUATION_STATUSES, required: true, default: 'ASSIGNED' },
    scores: { type: [scoreSchema], default: () => [] },
    overallScore: { type: Number, default: null },
    maxScore: { type: Number, required: true, default: 100 },
    overallFeedback: { type: String, default: null },
    overallFeedbackVisibility: { type: String, enum: FEEDBACK_VISIBILITIES, required: true, default: 'BUILDER_VISIBLE' },
    scoreVisibility: { type: String, enum: FEEDBACK_VISIBILITIES, required: true, default: 'BUILDER_VISIBLE' },
    internalNotes: { type: String, default: null },
    showEvaluatorIdentity: { type: Boolean, required: true, default: false },
    assignedBy: { type: ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, required: true, default: () => new Date() },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { collection: 'evaluations', timestamps: true },
);
evaluationSchema.index({ submissionId: 1, evaluatorId: 1 }, { unique: true }); // one review per evaluator per submission
evaluationSchema.index({ evaluatorId: 1, status: 1, updatedAt: -1 });
evaluationSchema.index({ projectId: 1, status: 1 });
evaluationSchema.index({ submissionId: 1, status: 1 });
evaluationSchema.index({ opportunityId: 1, status: 1 });
evaluationSchema.index({ templateId: 1 });
