import { Schema } from 'mongoose';
import {
  APPLICATION_QUESTION_TYPES,
  OPPORTUNITY_MODES,
  OPPORTUNITY_TYPES,
  PUBLISH_STATUSES,
  RESOURCE_TYPES,
} from './enums.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId, Mixed } = Schema.Types;

/**
 * Spec model "ApplicationQuestion" → embedded `opportunities.applicationQuestions[]`.
 * Keeps its own `_id` so an application's answers can reference the question they answer.
 */
const applicationQuestionSchema = new Schema({
  label: { type: String, required: true },
  type: { type: String, enum: APPLICATION_QUESTION_TYPES, required: true },
  required: { type: Boolean, required: true, default: false },
  options: { type: [String], default: () => [] },
  displayOrder: { type: Number, required: true, default: 0 },
});

const ref = (model) => ({ type: ObjectId, ref: model, default: null });
export const publishFields = {
  status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
  publishedAt: { type: Date, default: null },
};

/**
 * Structured detail blocks (stages, rewards, FAQ, contact). Unstop shows all four beside the
 * free-form description, and `eligibility`/`prizeInformation` alone can't express them. Every
 * one is optional with a default, so existing rows load unchanged (spec §95) — a reader must
 * still use `row.rounds ?? []`, because `.lean()` does not materialise Mongoose defaults.
 * Shared with the Job schema so one shape serves two entities (spec §96).
 */
export const roundSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    mode: { type: String, enum: OPPORTUNITY_MODES, default: null },
    location: { type: String, default: null },
    displayOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

export const timelineEntrySchema = new Schema(
  {
    label: { type: String, required: true },
    date: { type: Date, default: null },
    description: { type: String, default: null },
    displayOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

export const prizeSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    rank: { type: String, default: null },
    value: { type: Number, default: null },
    currency: { type: String, default: null },
    quantity: { type: Number, default: null },
    displayOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

export const faqSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: null },
    displayOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const contactSchema = new Schema(
  {
    name: { type: String, default: null },
    designation: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    website: { type: String, default: null },
  },
  { _id: false },
);

/** Homepage sections stored as validated JSON blocks keyed by section (e.g. "hero"). */
export const homepageContentSchema = new Schema(
  {
    sectionKey: { type: String, required: true },
    content: { type: Mixed, required: true },
    ...publishFields,
    updatedBy: ref('User'),
  },
  { collection: 'homepage_content', timestamps: true, minimize: false },
);
homepageContentSchema.index({ sectionKey: 1 }, { unique: true });

export const pathCardSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: null },
    imageId: ref('MediaAsset'),
    ctaLabel: { type: String, required: true },
    ctaUrl: { type: String, required: true },
    displayOrder: { type: Number, required: true, default: 0 },
    ...publishFields,
  },
  { collection: 'path_cards', timestamps: true },
);
pathCardSchema.index({ key: 1 }, { unique: true });
pathCardSchema.index({ status: 1, displayOrder: 1 });

export const partnerSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    logoId: ref('MediaAsset'),
    website: { type: String, default: null },
    description: { type: String, default: null },
    categoryId: ref('Category'),
    verified: { type: Boolean, required: true, default: false },
    featured: { type: Boolean, required: true, default: false },
    displayOrder: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: false },
  },
  { collection: 'partners', timestamps: true },
);
partnerSchema.index({ slug: 1 }, { unique: true });
partnerSchema.index({ active: 1, featured: 1, displayOrder: 1 });

/**
 * Search support: `searchTerms` holds the lower-cased words of the searchable fields
 * (title, organisation, descriptions, location, skills) and is indexed, so anchored
 * prefix regexes ("hack" → /^hack/) use index bounds. `titleTerms` drives ranking.
 * Both are maintained by the service layer on every write.
 * Exported so the Job schema indexes its search text the same way (spec §96).
 */
export const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * Phase 3 — whether (and how) an opportunity accepts PROJECT submissions (distinct from Phase 2
 * person applications). All default-safe: existing opportunities simply don't accept projects.
 */
const submissionSettingsSchema = new Schema(
  {
    acceptsProjects: { type: Boolean, required: true, default: false },
    deadline: { type: Date, default: null }, // falls back to applicationDeadline / endDate
    guidelines: { type: String, default: null },
    requireRepository: { type: Boolean, required: true, default: false },
    requireDemo: { type: Boolean, required: true, default: false },
    requireVideo: { type: Boolean, required: true, default: false },
    requirePublished: { type: Boolean, required: true, default: false },
    minTeamSize: { type: Number, default: null },
    maxTeamSize: { type: Number, default: null },
    evaluationTemplateId: { type: ObjectId, ref: 'EvaluationTemplate', default: null },
  },
  { _id: false },
);

export const opportunitySchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    partnerId: ref('Partner'),
    organizationName: { type: String, required: true },
    // Set when a verified organization posted it from its own dashboard (null = STUDLYF-curated).
    organizationId: ref('Organization'),
    organizationLogoId: ref('MediaAsset'),
    type: { type: String, enum: OPPORTUNITY_TYPES, required: true },
    categoryId: ref('Category'),
    shortDescription: { type: String, required: true },
    description: { type: String, default: null },
    location: { type: String, default: null },
    mode: { type: String, enum: OPPORTUNITY_MODES, required: true },
    applicationDeadline: { type: Date, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    externalUrl: { type: String, default: null },
    bannerId: ref('MediaAsset'),
    skills: { type: [embeddedTagSchema], default: [] },
    // Phase 2 — on-platform applications. All default-safe (no data migration needed).
    eligibility: { type: String, default: null },
    prizeInformation: { type: String, default: null },
    applicationQuestions: { type: [applicationQuestionSchema], default: () => [] },
    submissionSettings: { type: submissionSettingsSchema, default: () => ({}) },
    // Structured detail blocks — "Stages & Timelines", "Rewards & Prizes", FAQ and a contact.
    rounds: { type: [roundSchema], default: () => [] },
    timeline: { type: [timelineEntrySchema], default: () => [] },
    prizes: { type: [prizeSchema], default: () => [] },
    faqs: { type: [faqSchema], default: () => [] },
    contact: { type: contactSchema, default: () => ({}) },
    venue: { type: String, default: null },
    ...publishFields,
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'opportunities', timestamps: true },
);
opportunitySchema.index({ slug: 1 }, { unique: true });
opportunitySchema.index({ organizationId: 1, updatedAt: -1 });
opportunitySchema.index({ status: 1, publishedAt: -1 });
opportunitySchema.index({ status: 1, featured: 1, applicationDeadline: 1 });
opportunitySchema.index({ type: 1, status: 1 });
opportunitySchema.index({ categoryId: 1 });
opportunitySchema.index({ 'skills.slug': 1 });
opportunitySchema.index({ searchTerms: 1 });
opportunitySchema.index({ updatedAt: -1 });
opportunitySchema.index({ 'submissionSettings.acceptsProjects': 1, status: 1 });

export const resourceSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    description: { type: String, required: true },
    thumbnailId: ref('MediaAsset'),
    categoryId: ref('Category'),
    content: { type: String, default: null },
    externalUrl: { type: String, default: null },
    authorName: { type: String, default: null },
    authorUserId: ref('User'),
    tags: { type: [embeddedTagSchema], default: [] },
    ...publishFields,
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'resources', timestamps: true },
);
resourceSchema.index({ slug: 1 }, { unique: true });
resourceSchema.index({ status: 1, publishedAt: -1 });
resourceSchema.index({ status: 1, featured: 1, publishedAt: -1 });
resourceSchema.index({ type: 1, status: 1 });
resourceSchema.index({ categoryId: 1 });
resourceSchema.index({ 'tags.slug': 1 });
resourceSchema.index({ searchTerms: 1 });
resourceSchema.index({ updatedAt: -1 });

export const platformStatSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    suffix: { type: String, default: null },
    description: { type: String, default: null },
    displayOrder: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: false },
  },
  { collection: 'platform_stats', timestamps: true },
);
platformStatSchema.index({ key: 1 }, { unique: true });
platformStatSchema.index({ active: 1, displayOrder: 1 });

export const testimonialSchema = new Schema(
  {
    personName: { type: String, required: true },
    designation: { type: String, default: null },
    organization: { type: String, default: null },
    quote: { type: String, required: true },
    photoId: ref('MediaAsset'),
    categoryId: ref('Category'),
    featured: { type: Boolean, required: true, default: false },
    active: { type: Boolean, required: true, default: false },
    displayOrder: { type: Number, required: true, default: 0 },
  },
  { collection: 'testimonials', timestamps: true },
);
testimonialSchema.index({ active: 1, featured: -1, displayOrder: 1 });
