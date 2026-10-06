import { Schema } from 'mongoose';
import { PROJECT_CATEGORIES, PROJECT_MEDIA_KINDS, PROJECT_MEMBER_ROLES, PROJECT_TYPES, SUBMISSION_STATUSES } from './enums.js';

const { ObjectId } = Schema.Types;

/** Append-only trail of every status transition (who moved it, when, and why). */
const statusEventSchema = new Schema(
  {
    status: { type: String, enum: SUBMISSION_STATUSES, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    byUserId: { type: ObjectId, ref: 'User', default: null },
    note: { type: String, default: null },
  },
  { _id: false },
);

/**
 * The project exactly as it was submitted. Evaluators score this snapshot, so later edits to
 * the live project can never change what was judged (and completed evaluations stay truthful).
 */
const projectSnapshotSchema = new Schema(
  {
    title: { type: String, required: true },
    tagline: { type: String, default: null },
    description: { type: String, default: null },
    problemStatement: { type: String, default: null },
    solution: { type: String, default: null },
    impact: { type: String, default: null },
    category: { type: String, enum: PROJECT_CATEGORIES, default: 'OTHER' },
    projectType: { type: String, enum: PROJECT_TYPES, default: 'OTHER' },
    technologies: { type: [String], default: () => [] },
    skills: {
      type: [new Schema({ slug: String, name: String }, { _id: false })],
      default: () => [],
    },
    links: {
      type: new Schema({ repo: String, demo: String, video: String, website: String }, { _id: false }),
      default: () => ({}),
    },
    coverImageId: { type: ObjectId, ref: 'MediaAsset', default: null },
    media: {
      type: [
        new Schema(
          { assetId: { type: ObjectId, ref: 'MediaAsset' }, kind: { type: String, enum: PROJECT_MEDIA_KINDS }, caption: String },
          { _id: false },
        ),
      ],
      default: () => [],
    },
    teamName: { type: String, default: null },
    team: {
      type: [
        new Schema(
          { userId: { type: ObjectId, ref: 'User' }, name: String, username: String, role: { type: String, enum: PROJECT_MEMBER_ROLES } },
          { _id: false },
        ),
      ],
      default: () => [],
    },
    capturedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

/**
 * Spec model "ProjectSubmission" — a project entered into an opportunity (hackathon,
 * competition, challenge…). Distinct from Phase 2 Applications, which are a builder applying
 * as a person; a submission is a project being judged.
 */
export const projectSubmissionSchema = new Schema(
  {
    projectId: { type: ObjectId, ref: 'Project', required: true },
    opportunityId: { type: ObjectId, ref: 'Opportunity', required: true },
    submittedBy: { type: ObjectId, ref: 'User', required: true },
    // Reserved for the Phase 4 organizer model: submissions will be scoped to the organization
    // that runs the opportunity. Always null until organizations exist.
    organizationId: { type: ObjectId, default: null },
    status: { type: String, enum: SUBMISSION_STATUSES, required: true, default: 'DRAFT' },
    note: { type: String, default: null }, // the team's message to organisers
    reviewerNote: { type: String, default: null }, // organiser/admin note shown to the team
    statusHistory: { type: [statusEventSchema], default: () => [] },
    projectSnapshot: { type: projectSnapshotSchema, default: null },
    submittedAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
  },
  { collection: 'project_submissions', timestamps: true },
);
// One submission per project per opportunity (withdrawn ones are re-submitted in place).
projectSubmissionSchema.index({ projectId: 1, opportunityId: 1 }, { unique: true });
projectSubmissionSchema.index({ opportunityId: 1, status: 1 });
projectSubmissionSchema.index({ submittedBy: 1, updatedAt: -1 });
projectSubmissionSchema.index({ status: 1, updatedAt: -1 });
projectSubmissionSchema.index({ organizationId: 1 });
