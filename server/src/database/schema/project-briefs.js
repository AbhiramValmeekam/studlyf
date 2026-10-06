import { Schema } from 'mongoose';
import { COURSE_LEVELS, PROJECT_CATEGORIES, PUBLISH_STATUSES } from './enums.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * A build-ready project brief — the "Build A Project" catalog. Each brief is a
 * self-contained challenge a builder can pick up: a problem statement, difficulty,
 * a checklist of deliverables and the skills it exercises. `category` reuses the
 * community project taxonomy so a finished build slots straight into the showcase;
 * `difficulty` reuses the course level scale. `starterUrl` links to a starter repo
 * or template. Deliverables are embedded plain strings — a lightweight checklist,
 * not a submission/evaluation system (spec §34 keeps that out of scope).
 */
export const projectBriefSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    category: { type: String, enum: PROJECT_CATEGORIES, required: true, default: 'OTHER' },
    difficulty: { type: String, enum: COURSE_LEVELS, required: true, default: 'BEGINNER' },
    summary: { type: String, required: true },
    description: { type: String, default: null }, // full brief / problem statement (rich text)
    thumbnailId: ref('MediaAsset'),
    estimatedHours: { type: Number, default: null }, // rough time-to-build
    deliverables: { type: [String], default: [] }, // checklist of what "done" looks like
    starterUrl: { type: String, default: null }, // starter repo / template link
    skills: { type: [embeddedTagSchema], default: [] },
    status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
    publishedAt: { type: Date, default: null },
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'project_briefs', timestamps: true },
);
projectBriefSchema.index({ slug: 1 }, { unique: true });
projectBriefSchema.index({ status: 1, category: 1, publishedAt: -1 });
projectBriefSchema.index({ status: 1, featured: 1, publishedAt: -1 });
projectBriefSchema.index({ category: 1, difficulty: 1, status: 1 });
projectBriefSchema.index({ 'skills.slug': 1 });
projectBriefSchema.index({ searchTerms: 1 });
projectBriefSchema.index({ updatedAt: -1 });
