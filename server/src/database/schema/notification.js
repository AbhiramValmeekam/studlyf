import { Schema } from 'mongoose';
import { NOTIFICATION_TYPES } from './enums.js';

const { ObjectId, Mixed } = Schema.Types;

/** In-app only for this phase (no email/push). Emitted by the application status flow. */
export const notificationSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: null },
    data: { type: Mixed, default: () => ({}) },
    readAt: { type: Date, default: null },
    // Idempotency key for event notifications (e.g. "SUBMISSION_STATUS:<id>:SHORTLISTED") — the
    // partial unique index turns a repeated event into a no-op instead of a duplicate notification.
    dedupeKey: { type: String, default: null },
  },
  { collection: 'notifications', timestamps: true, minimize: false },
);
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);
