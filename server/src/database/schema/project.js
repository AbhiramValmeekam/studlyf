import { Schema } from 'mongoose';
import {
  MODERATION_STATUSES,
  PROJECT_CATEGORIES,
  PROJECT_MEDIA_KINDS,
  PROJECT_MEMBER_ROLES,
  PROJECT_MEMBER_STATUSES,
  PROJECT_REPORT_REASONS,
  PROJECT_REPORT_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_VISIBILITIES,
} from './enums.js';

const { ObjectId } = Schema.Types;

const ref = (model) => ({ type: ObjectId, ref: model, default: null });

// Outbound links a builder attaches to a project. Spec mapping:
//   repository_url → repo · demo_url → demo · live_url → website · video_url → video
const projectLinksSchema = new Schema(
  {
    repo: { type: String, default: null },
    demo: { type: String, default: null },
    video: { type: String, default: null },
    website: { type: String, default: null },
  },
  { _id: false },
);

// Spec model "ProjectSkill" → embedded `projects.skills[]`, a copy of the master Skill
// vocabulary row (read without joins, like builder profile skills). Never a second skills table.
const projectSkillSchema = new Schema(
  {
    skillId: { type: ObjectId, ref: 'Skill', required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

/** Screenshots and supporting documents. Files live in object storage; this is a reference. */
const projectMediaSchema = new Schema({
  assetId: { type: ObjectId, ref: 'MediaAsset', required: true },
  kind: { type: String, enum: PROJECT_MEDIA_KINDS, required: true },
  caption: { type: String, default: null },
});

// Same indexed-word-list search support as content documents (see content.js).
const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * A builder project — the core proof-of-work record. Phase 3 extends the Phase 2/3 community
 * showcase document rather than introducing a second project store, so the community feed,
 * upvotes and the portfolio all read the same rows.
 *
 * Spec field mapping (existing names kept for backward compatibility):
 *   owner_user_id → authorUserId · short_description → tagline · thumbnail → coverImageId
 *   technologies  → technologies (display names; `tags` is the derived lower-case facet list)
 *
 * Visibility vs status: `status` is the work/review stage; who can SEE the project is decided by
 * `visibility`, `publishedAt` (set only by the validated publish action) and moderation.
 */
export const projectSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    tagline: { type: String, default: null },
    description: { type: String, default: null }, // sanitised HTML
    problemStatement: { type: String, default: null },
    solution: { type: String, default: null },
    impact: { type: String, default: null },
    category: { type: String, enum: PROJECT_CATEGORIES, required: true, default: 'OTHER' },
    projectType: { type: String, enum: PROJECT_TYPES, required: true, default: 'PERSONAL' },
    technologies: { type: [String], default: () => [] },
    // Lower-cased slugs derived from `technologies` — powers community tag filters/popular tags.
    tags: { type: [String], default: () => [] },
    skills: { type: [projectSkillSchema], default: () => [] },
    coverImageId: ref('MediaAsset'),
    media: { type: [projectMediaSchema], default: () => [] },
    links: { type: projectLinksSchema, default: () => ({}) },
    // Spec entity "ProjectTeam" → the project itself is the team container; members live in project_members.
    teamName: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    authorUserId: { type: ObjectId, ref: 'User', required: true },
    authorProfileId: { type: ObjectId, ref: 'BuilderProfile', required: true },
    status: { type: String, enum: PROJECT_STATUSES, required: true, default: 'DRAFT' },
    visibility: { type: String, enum: PROJECT_VISIBILITIES, required: true, default: 'PRIVATE' },
    publishedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    // Moderation — PENDING projects stay visible (post-moderation); REJECTED/HIDDEN never are.
    moderationStatus: { type: String, enum: MODERATION_STATUSES, required: true, default: 'PENDING' },
    moderationReason: { type: String, default: null },
    moderatedBy: ref('User'),
    moderatedAt: { type: Date, default: null },
    reportCount: { type: Number, required: true, default: 0 },
    // Community showcase
    upvoteCount: { type: Number, required: true, default: 0 },
    featured: { type: Boolean, required: true, default: false },
    ...searchFields,
  },
  { collection: 'projects', timestamps: true },
);
projectSchema.index({ slug: 1 }, { unique: true });
projectSchema.index({ authorUserId: 1, updatedAt: -1 });
projectSchema.index({ status: 1 });
projectSchema.index({ visibility: 1, moderationStatus: 1, publishedAt: -1 }); // discovery NEW
projectSchema.index({ visibility: 1, updatedAt: -1 }); // discovery "recently updated"
projectSchema.index({ visibility: 1, upvoteCount: -1 }); // community TOP
projectSchema.index({ visibility: 1, featured: -1, upvoteCount: -1 });
projectSchema.index({ visibility: 1, category: 1 });
projectSchema.index({ projectType: 1 });
projectSchema.index({ 'skills.slug': 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ moderationStatus: 1, reportCount: -1, updatedAt: -1 }); // admin moderation queue
projectSchema.index({ searchTerms: 1 });

/**
 * Spec model "ProjectMember". The owner is always a member (role OWNER, ACTIVE). Everyone else
 * is INVITED by the owner and appears on the project only after accepting — nobody can be
 * attributed to a project without consent. `canEdit` lets trusted members edit + submit.
 */
export const projectMemberSchema = new Schema(
  {
    projectId: { type: ObjectId, ref: 'Project', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, enum: PROJECT_MEMBER_ROLES, required: true },
    status: { type: String, enum: PROJECT_MEMBER_STATUSES, required: true, default: 'INVITED' },
    canEdit: { type: Boolean, required: true, default: false },
    invitedBy: ref('User'),
    joinedAt: { type: Date, default: null },
  },
  { collection: 'project_members', timestamps: true },
);
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true }); // no duplicate membership
projectMemberSchema.index({ userId: 1, status: 1 });
projectMemberSchema.index({ projectId: 1, status: 1 });

/** A user's report about a project (one per reporter per project). Feeds the moderation queue. */
export const projectReportSchema = new Schema(
  {
    projectId: { type: ObjectId, ref: 'Project', required: true },
    reporterUserId: { type: ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: PROJECT_REPORT_REASONS, required: true },
    details: { type: String, default: null },
    status: { type: String, enum: PROJECT_REPORT_STATUSES, required: true, default: 'OPEN' },
    resolvedBy: ref('User'),
    resolvedAt: { type: Date, default: null },
  },
  { collection: 'project_reports', timestamps: true },
);
projectReportSchema.index({ projectId: 1, reporterUserId: 1 }, { unique: true });
projectReportSchema.index({ status: 1, createdAt: -1 });

/**
 * One upvote per (project, user). The unique compound index is the final guard against
 * double-voting races; toggling deletes/creates a row and adjusts `projects.upvoteCount`.
 */
export const projectUpvoteSchema = new Schema(
  {
    projectId: { type: ObjectId, ref: 'Project', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
  },
  { collection: 'project_upvotes', timestamps: true },
);
projectUpvoteSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectUpvoteSchema.index({ userId: 1, createdAt: -1 });
