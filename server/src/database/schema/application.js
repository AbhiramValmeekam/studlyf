import { Schema } from 'mongoose';
import { APPLICATION_STATUSES } from './enums.js';

const { ObjectId } = Schema.Types;

// Spec model "ApplicationAnswer" → embedded `applications.answers[]`. `questionId` points at
// the embedded `opportunities.applicationQuestions[]._id` the answer responds to.
const answerSchema = new Schema(
  {
    questionId: { type: ObjectId, required: true },
    type: { type: String, required: true },
    text: { type: String, default: null },
    choices: { type: [String], default: () => [] },
  },
  { _id: false },
);

/** Append-only audit trail of every status transition (who moved it, when, and why). */
const statusEventSchema = new Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    byUserId: { type: ObjectId, ref: 'User', default: null },
    note: { type: String, default: null },
  },
  { _id: false },
);

export const applicationSchema = new Schema(
  {
    opportunityId: { type: ObjectId, ref: 'Opportunity', required: true },
    builderUserId: { type: ObjectId, ref: 'User', required: true },
    builderProfileId: { type: ObjectId, ref: 'BuilderProfile', required: true },
    status: { type: String, enum: APPLICATION_STATUSES, required: true, default: 'DRAFT' },
    answers: { type: [answerSchema], default: () => [] },
    statusHistory: { type: [statusEventSchema], default: () => [] },
    submittedAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
    reviewerNote: { type: String, default: null },
  },
  { collection: 'applications', timestamps: true },
);
// One application per builder per opportunity — the final guard against double-apply races.
applicationSchema.index({ opportunityId: 1, builderUserId: 1 }, { unique: true });
applicationSchema.index({ builderUserId: 1, status: 1 });
applicationSchema.index({ opportunityId: 1, status: 1 });
applicationSchema.index({ status: 1, updatedAt: -1 });
