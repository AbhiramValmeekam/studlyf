import { Schema } from 'mongoose';
import { CERTIFICATE_STATUSES, CERTIFICATE_TYPES } from './enums.js';

const { ObjectId, Mixed } = Schema.Types;

/**
 * An issued, publicly verifiable credential (spec §18/§68).
 *
 * This is deliberately not an Achievement. An achievement is a milestone on a builder's profile;
 * a certificate is the document behind it that a third party checks against a code. So the facts a
 * verifier needs — recipient, issuer, title, date — are denormalized here and read without a join
 * or a session, and the record can be revoked without touching the achievement.
 *
 * `achievementId` is unique when present, which makes issuance idempotent: re-running the same
 * result event can never mint a second certificate for the same achievement.
 */
export const certificateSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    organizationId: { type: ObjectId, ref: 'Organization', default: null },
    opportunityId: { type: ObjectId, ref: 'Opportunity', default: null },
    achievementId: { type: ObjectId, ref: 'Achievement', default: null },
    type: { type: String, enum: CERTIFICATE_TYPES, required: true },
    title: { type: String, required: true },
    recipientName: { type: String, required: true },
    issuerName: { type: String, required: true },
    issueDate: { type: Date, required: true, default: () => new Date() },
    verificationCode: { type: String, required: true, unique: true },
    status: { type: String, enum: CERTIFICATE_STATUSES, required: true, default: 'ACTIVE' },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
    metadata: { type: Mixed, default: () => ({}) },
  },
  { collection: 'certificates', timestamps: true, minimize: false },
);

certificateSchema.index({ userId: 1, issueDate: -1 });
certificateSchema.index({ organizationId: 1, issueDate: -1 });
certificateSchema.index({ opportunityId: 1 });
// One certificate per achievement — the partial index only applies to rows that came from one.
certificateSchema.index({ achievementId: 1 }, { unique: true, partialFilterExpression: { achievementId: { $type: 'objectId' } } });
