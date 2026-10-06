import { Schema } from 'mongoose';
import {
  ACHIEVEMENT_SOURCES,
  ACHIEVEMENT_TYPES,
  ACHIEVEMENT_VERIFICATION_STATUSES,
  ACHIEVEMENT_VISIBILITIES,
} from './enums.js';

const { ObjectId, Mixed } = Schema.Types;

/**
 * Proof-of-work milestones on a builder's profile.
 *   source SYSTEM — issued by STUDLYF from platform events (submission shortlisted/selected,
 *                   project completed…) or awarded by an admin; VERIFIED.
 *   source USER   — added by the builder (e.g. an external certificate); always starts
 *                   UNVERIFIED and only an admin can verify it.
 * `sourceKey` makes system issuance idempotent (e.g. "SHORTLISTED:<submissionId>"): the partial
 * unique index guarantees the same event can never award the same user twice.
 */
export const achievementSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    projectId: { type: ObjectId, ref: 'Project', default: null },
    opportunityId: { type: ObjectId, ref: 'Opportunity', default: null },
    submissionId: { type: ObjectId, ref: 'ProjectSubmission', default: null },
    title: { type: String, required: true },
    description: { type: String, default: null },
    type: { type: String, enum: ACHIEVEMENT_TYPES, required: true },
    issuer: { type: String, default: null },
    date: { type: Date, required: true, default: () => new Date() },
    source: { type: String, enum: ACHIEVEMENT_SOURCES, required: true },
    verificationStatus: { type: String, enum: ACHIEVEMENT_VERIFICATION_STATUSES, required: true, default: 'UNVERIFIED' },
    visibility: { type: String, enum: ACHIEVEMENT_VISIBILITIES, required: true, default: 'PUBLIC' },
    metadata: { type: Mixed, default: () => ({}) },
    sourceKey: { type: String, default: null },
    verifiedBy: { type: ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
  },
  { collection: 'achievements', timestamps: true, minimize: false },
);
achievementSchema.index({ userId: 1, date: -1 });
achievementSchema.index({ projectId: 1 });
achievementSchema.index({ opportunityId: 1 });
achievementSchema.index({ verificationStatus: 1, createdAt: -1 });
achievementSchema.index(
  { userId: 1, sourceKey: 1 },
  { unique: true, partialFilterExpression: { sourceKey: { $type: 'string' } } },
);
