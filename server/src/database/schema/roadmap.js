import { Schema } from 'mongoose';
import { PUBLISH_STATUSES, ROADMAP_STEP_PRIORITIES } from './enums.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

/**
 * One skill a target role needs. `skillSlug` is the join key: it is matched against the slugs on
 * a builder's profile (and against the vocabulary in `skills`), so the roadmap is a diff of
 * "what this role needs" against "what you already have" rather than a hand-written to-do list.
 */
const roadmapStepSchema = new Schema(
  {
    skillSlug: { type: String, required: true },
    skillName: { type: String, required: true },
    /** CORE steps are the ones that actually block the role; OPTIONAL is polish. */
    priority: { type: String, enum: ROADMAP_STEP_PRIORITIES, required: true, default: 'CORE' },
    rationale: { type: String, default: null },
    /** Optional course/resource slug that teaches it — the client links straight to it. */
    resourceSlug: { type: String, default: null },
  },
  { _id: false },
);

/**
 * A career roadmap template (spec §52): the skills a target role needs, in the order they are
 * worth learning. Templates are authored in the CMS; a user's roadmap is computed from one of
 * these plus their profile, never stored as a copy of it.
 */
export const roadmapTemplateSchema = new Schema(
  {
    role: { type: String, required: true },
    slug: { type: String, required: true },
    roleFamily: { type: String, default: null },
    summary: { type: String, required: true },
    description: { type: String, default: null },
    /** Why this role is worth aiming at right now — shown above the plan. */
    demandNote: { type: String, default: null },
    steps: { type: [roadmapStepSchema], default: () => [] },
    status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
    publishedAt: { type: Date, default: null },
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    searchTerms: { type: [String], default: () => [], select: false },
    titleTerms: { type: [String], default: () => [], select: false },
  },
  { collection: 'roadmap_templates', timestamps: true },
);
roadmapTemplateSchema.index({ slug: 1 }, { unique: true });
roadmapTemplateSchema.index({ status: 1, featured: 1, publishedAt: -1 });
roadmapTemplateSchema.index({ status: 1, roleFamily: 1 });
roadmapTemplateSchema.index({ searchTerms: 1 });

/**
 * A person's chosen goal. One at a time — aiming at two roles at once produces a plan that is
 * honest about neither — so `userId` is unique and choosing again replaces the row.
 * Only the *choices* live here: which role, what they marked done by hand. The steps themselves
 * are recomputed from the template and the live profile on every read, so a skill added to the
 * builder profile shows up as complete without anyone syncing anything.
 */
export const userRoadmapSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    templateId: { type: ObjectId, ref: 'RoadmapTemplate', required: true },
    /** Denormalised so the goal still reads correctly if the template is renamed or retired. */
    roleSlug: { type: String, required: true },
    /** Skills the person has but hasn't put on their profile — evidence lives off-platform. */
    completedSkillSlugs: { type: [String], default: [] },
    targetDate: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
  },
  { collection: 'user_roadmaps', timestamps: true },
);
userRoadmapSchema.index({ userId: 1 }, { unique: true });
userRoadmapSchema.index({ templateId: 1, updatedAt: -1 });
