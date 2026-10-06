import { Schema } from 'mongoose';
import { SAVEABLE_TYPES } from './enums.js';

const { ObjectId } = Schema.Types;

/**
 * A saved item (spec §57) — one row per (user, entity) pair, across every surface of the
 * platform. Deliberately opaque about the target: the row stores a type tag and an id, and the
 * saved-items service resolves the type to a model, a visibility predicate and a card shape.
 *
 * That indirection is the point. Adding a saveable surface is a registry entry, not a new
 * collection and a new join table, so "saved" keeps one meaning everywhere (§96).
 */
export const savedItemSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    entityType: { type: String, enum: SAVEABLE_TYPES, required: true },
    entityId: { type: ObjectId, required: true },
    savedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'saved_items', timestamps: true },
);

// The unique compound index is what makes saving idempotent — a double-click is one row.
savedItemSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });
// The saved-items list is always "mine, newest first".
savedItemSchema.index({ userId: 1, savedAt: -1 });
// "Who saved this?" — for counts and, later, notifications to the owner.
savedItemSchema.index({ entityType: 1, entityId: 1 });
