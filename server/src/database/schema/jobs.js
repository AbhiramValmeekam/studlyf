import { Schema } from 'mongoose';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, SALARY_PERIODS, WORK_MODES } from './enums.js';
import { faqSchema, publishFields, roundSchema, searchFields } from './content.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

/**
 * An HR job post (spec §73). A first-class entity rather than an Opportunity with `type: 'JOB'`,
 * because the two answer different questions: a job carries compensation, seniority and openings,
 * and it is the anchor the private hiring pipeline hangs off (`HrCandidate.jobId`). It reuses the
 * Opportunity's `roundSchema`/`faqSchema` for its process and FAQ blocks — one shape, two entities
 * (spec §96) — and `publishFields` for its draft→published lifecycle.
 *
 * `companyName` is denormalised from the poster's *verified* HrProfile at create time, so a public
 * listing never joins per row and the company can only ever be the one STUDLYF verified.
 */
export const jobSchema = new Schema(
  {
    hrUserId: { type: ObjectId, ref: 'User', required: true },
    hrProfileId: ref('HrProfile'),
    // Stamped from the verified HrProfile at create/update — never taken from the request body.
    companyName: { type: String, required: true },

    title: { type: String, required: true },
    slug: { type: String, required: true },
    summary: { type: String, required: true },
    description: { type: String, default: null },

    employmentType: { type: String, enum: EMPLOYMENT_TYPES, required: true },
    workMode: { type: String, enum: WORK_MODES, required: true },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, default: null },
    location: { type: String, default: null },
    openings: { type: Number, default: 1 },

    minExperienceYears: { type: Number, default: null },
    maxExperienceYears: { type: Number, default: null },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryCurrency: { type: String, default: null },
    salaryPeriod: { type: String, enum: SALARY_PERIODS, default: null },
    // The poster can advertise a range or leave it undisclosed; false never hides a range, it
    // only means "on request", so the public serializer masks the numbers rather than the row.
    salaryDisclosed: { type: Boolean, required: true, default: true },

    skills: { type: [embeddedTagSchema], default: [] },
    categoryId: ref('Category'),
    responsibilities: { type: String, default: null },
    requirements: { type: String, default: null },
    perks: { type: [String], default: () => [] },

    // Shared with Opportunity — the interview/selection process and the FAQ block.
    rounds: { type: [roundSchema], default: () => [] },
    faqs: { type: [faqSchema], default: () => [] },

    applicationDeadline: { type: Date, default: null },
    startDate: { type: Date, default: null },
    externalUrl: { type: String, default: null },
    contactEmail: { type: String, default: null },
    bannerId: ref('MediaAsset'),

    ...publishFields,
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'jobs', timestamps: true },
);
jobSchema.index({ slug: 1 }, { unique: true });
jobSchema.index({ status: 1, publishedAt: -1 });
jobSchema.index({ hrUserId: 1, updatedAt: -1 });
jobSchema.index({ 'skills.slug': 1 });
jobSchema.index({ workMode: 1, employmentType: 1, status: 1 });
jobSchema.index({ status: 1, featured: 1, publishedAt: -1 });
jobSchema.index({ categoryId: 1 });
jobSchema.index({ searchTerms: 1 });
jobSchema.index({ updatedAt: -1 });
