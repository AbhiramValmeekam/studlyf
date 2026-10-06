import { Schema } from 'mongoose';
import { COURSE_LEVELS, MOCK_KINDS, PUBLISH_STATUSES } from './enums.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * A practice drill in the mock-test & interview catalog. `kind` splits the two surfaces
 * sharing this collection:
 *   TEST      → timed skill assessments (carry `questionCount`)
 *   INTERVIEW → mock interview sets (behavioural / technical prompts)
 * `level` reuses the course difficulty scale; `startUrl` links out to where the student
 * takes the drill. Skills are embedded so the same tag vocabulary powers discovery.
 */
export const mockDrillSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    kind: { type: String, enum: MOCK_KINDS, required: true, default: 'TEST' },
    level: { type: String, enum: COURSE_LEVELS, required: true, default: 'BEGINNER' },
    summary: { type: String, required: true },
    description: { type: String, default: null },
    thumbnailId: ref('MediaAsset'),
    role: { type: String, default: null }, // target role, e.g. "Frontend Engineer"
    provider: { type: String, default: null },
    durationMinutes: { type: Number, default: null },
    questionCount: { type: Number, default: null }, // for TEST drills
    startUrl: { type: String, default: null }, // where the student takes the drill
    skills: { type: [embeddedTagSchema], default: [] },
    status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
    publishedAt: { type: Date, default: null },
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'mock_drills', timestamps: true },
);
mockDrillSchema.index({ slug: 1 }, { unique: true });
mockDrillSchema.index({ status: 1, kind: 1, publishedAt: -1 });
mockDrillSchema.index({ status: 1, featured: 1, publishedAt: -1 });
mockDrillSchema.index({ kind: 1, level: 1, status: 1 });
mockDrillSchema.index({ 'skills.slug': 1 });
mockDrillSchema.index({ searchTerms: 1 });
mockDrillSchema.index({ updatedAt: -1 });
