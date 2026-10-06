import { Schema } from 'mongoose';
import { COURSE_LEVELS, OTT_KINDS, PUBLISH_STATUSES } from './enums.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * One instalment of a SERIES or COURSE. `key` is the stable handle progress rows point at, so
 * renaming an episode never orphans somebody's place in it.
 */
const episodeSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: null },
    durationMinutes: { type: Number, default: null },
    sourceUrl: { type: String, default: null },
  },
  { _id: false },
);

/**
 * STUD OTT (spec §55) — the platform's streaming shelf. `kind` splits four surfaces sharing this
 * collection, and they differ mostly in how they are consumed:
 *   VIDEO   → a single film / talk, watched in one sitting
 *   ARTICLE → long-form reading, no time axis
 *   SERIES  → an ordered run of episodes, watched across sessions
 *   COURSE  → an ordered run of lessons, usually completed rather than skimmed
 * A title's category comes from the shared `Category` taxonomy (scope is not a constraint — the
 * fixed set lives in the seed), and `skills` reuse the embedded tag vocabulary so the same
 * discovery filters work here as in courses and mock drills.
 */
export const ottSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    kind: { type: String, enum: OTT_KINDS, required: true, default: 'VIDEO' },
    summary: { type: String, required: true },
    description: { type: String, default: null },
    thumbnailId: ref('MediaAsset'),
    categoryId: ref('Category'),
    /** Who made it — a channel, a host, or the presenter. */
    byline: { type: String, default: null },
    level: { type: String, enum: COURSE_LEVELS, default: null },
    /** Runtime of a VIDEO/ARTICLE, or the nominal per-episode length of a SERIES/COURSE. */
    durationMinutes: { type: Number, default: null },
    /** Where a VIDEO plays or an ARTICLE is read. Episodes carry their own when they have one. */
    sourceUrl: { type: String, default: null },
    episodes: { type: [episodeSchema], default: [] },
    skills: { type: [embeddedTagSchema], default: [] },
    status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
    publishedAt: { type: Date, default: null },
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'ott', timestamps: true },
);
ottSchema.index({ slug: 1 }, { unique: true });
ottSchema.index({ status: 1, kind: 1, publishedAt: -1 });
ottSchema.index({ status: 1, featured: 1, publishedAt: -1 });
ottSchema.index({ status: 1, categoryId: 1 });
ottSchema.index({ 'skills.slug': 1 });
ottSchema.index({ searchTerms: 1 });
ottSchema.index({ updatedAt: -1 });

/**
 * Where somebody got to. One row per (viewer, title) for a single-subject title, and one per
 * episode for a SERIES/COURSE — `episodeKey` is the only thing that separates the two, so there
 * is one progress mechanism rather than a per-kind special case.
 *
 * This is deliberately separate from the content document: progress is per viewer, and it changes
 * on every heartbeat while a title's own fields change rarely.
 */
export const ottProgressSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    contentId: { type: ObjectId, ref: 'Ott', required: true },
    /** null for a single-subject title; the episode's `key` for a SERIES/COURSE. */
    episodeKey: { type: String, default: null },
    positionSeconds: { type: Number, required: true, default: 0, min: 0 },
    /** 0–100, so the UI can show a bar without knowing the runtime. */
    percent: { type: Number, required: true, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, required: true, default: false },
    lastWatchedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: 'ott_progress', timestamps: true },
);
// The uniqueness is what makes the write an idempotent upsert rather than a growing history.
ottProgressSchema.index({ userId: 1, contentId: 1, episodeKey: 1 }, { unique: true });
ottProgressSchema.index({ userId: 1, lastWatchedAt: -1 });
