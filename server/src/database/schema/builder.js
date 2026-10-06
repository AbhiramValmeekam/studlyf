import { Schema } from 'mongoose';
import { PROFILE_VISIBILITIES, SKILL_PROFICIENCIES } from './enums.js';

const { ObjectId } = Schema.Types;

// Spec model "BuilderSkill" → embedded `builder_profiles.skills[]` (a profile's skill set
// is always read with the profile), mirroring the Phase-1 `users.roles[]` embedding style.
const builderSkillSchema = new Schema(
  {
    skillId: { type: ObjectId, ref: 'Skill', default: null },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    proficiency: { type: String, enum: SKILL_PROFICIENCIES, required: true, default: 'INTERMEDIATE' },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    school: { type: String, required: true },
    program: { type: String, default: null },
    year: { type: String, default: null },
  },
  { _id: false },
);

/** Weighted profile-completion snapshot, recomputed and stored on every profile write. */
const completionSchema = new Schema(
  {
    score: { type: Number, required: true, default: 0 },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);

// Same search support as content documents: lower-cased indexed word lists maintained
// by the service layer so public builder search uses index bounds, never a scan.
const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * 1:1 satellite of `User` keyed by a unique `userId`. It never duplicates identity or
 * personal fields: name/email/phone/photo and the personal profile (college, city, social
 * links) live on `User` and are joined in on read. `education[]` holds *additional*
 * education only — the current college is `users.profile.college`.
 * The BUILDER role is granted at onboarding — this profile only requires it to exist.
 */
export const builderProfileSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    headline: { type: String, default: null },
    bio: { type: String, default: null },
    // Public portfolio layout id (validated against the template set at the Zod layer).
    template: { type: String, default: 'editorial' },
    // Validated against BUILDER_AVAILABILITIES at the Zod layer (kept plain so `null` is allowed).
    availability: { type: String, default: null },
    visibility: { type: String, enum: PROFILE_VISIBILITIES, required: true, default: 'PRIVATE' },
    education: { type: [educationSchema], default: () => [] },
    skills: { type: [builderSkillSchema], default: () => [] },
    completion: { type: completionSchema, default: () => ({ score: 0, updatedAt: null }) },
    // Ordered "Featured Projects" on the profile (owned or team projects). Only publicly
    // discoverable ones are ever shown; the cap comes from config (FEATURED_PROJECTS_LIMIT).
    featuredProjectIds: { type: [{ type: ObjectId, ref: 'Project' }], default: () => [] },
    ...searchFields,
  },
  { collection: 'builder_profiles', timestamps: true },
);
builderProfileSchema.index({ userId: 1 }, { unique: true });
builderProfileSchema.index({ username: 1 }, { unique: true });
builderProfileSchema.index({ visibility: 1, updatedAt: -1 });
builderProfileSchema.index({ 'skills.slug': 1 });
builderProfileSchema.index({ searchTerms: 1 });
