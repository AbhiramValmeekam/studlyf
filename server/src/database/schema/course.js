import { Schema } from 'mongoose';
import { COURSE_AUDIENCES, COURSE_LEVELS, PUBLISH_STATUSES } from './enums.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

/** A single lesson inside a module. Content is a link/summary — STUDLYF hosts no video itself. */
export const LESSON_KINDS = ['VIDEO', 'READING', 'QUIZ', 'PROJECT', 'LIVE'];

const lessonSchema = new Schema({
  title: { type: String, required: true },
  kind: { type: String, enum: LESSON_KINDS, required: true, default: 'READING' },
  durationMinutes: { type: Number, default: null },
  url: { type: String, default: null },
  displayOrder: { type: Number, required: true, default: 0 },
});

/** A module groups lessons into a chapter of the track. */
const moduleSchema = new Schema({
  title: { type: String, required: true },
  summary: { type: String, default: null },
  displayOrder: { type: Number, required: true, default: 0 },
  lessons: { type: [lessonSchema], default: () => [] },
});

const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * Learning track. `audience` splits the two surfaces sharing this collection:
 *   STUDENT → role-focused engineering-readiness Courses
 *   COMPANY → institutional / corporate Learning Modules (carries `provider`)
 * Modules and lessons are embedded (read without joins), mirroring the Phase-1 embedding style.
 */
export const courseSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    audience: { type: String, enum: COURSE_AUDIENCES, required: true, default: 'STUDENT' },
    level: { type: String, enum: COURSE_LEVELS, required: true, default: 'BEGINNER' },
    summary: { type: String, required: true },
    description: { type: String, default: null },
    thumbnailId: ref('MediaAsset'),
    provider: { type: String, default: null }, // organisation name for COMPANY modules
    role: { type: String, default: null }, // target role, e.g. "Frontend Engineer"
    durationHours: { type: Number, default: null },
    enrollUrl: { type: String, default: null },
    skills: { type: [embeddedTagSchema], default: [] },
    modules: { type: [moduleSchema], default: () => [] },
    ...{
      status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
      publishedAt: { type: Date, default: null },
    },
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'courses', timestamps: true },
);
courseSchema.index({ slug: 1 }, { unique: true });
courseSchema.index({ status: 1, audience: 1, publishedAt: -1 });
courseSchema.index({ status: 1, featured: 1, publishedAt: -1 });
courseSchema.index({ audience: 1, level: 1, status: 1 });
courseSchema.index({ 'skills.slug': 1 });
courseSchema.index({ searchTerms: 1 });
courseSchema.index({ updatedAt: -1 });
