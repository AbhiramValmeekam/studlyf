import { Schema } from 'mongoose';
import { PUBLISH_STATUSES, STUDHUB_TYPES } from './enums.js';
import { embeddedTagSchema } from './taxonomy.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });

const searchFields = {
  searchTerms: { type: [String], default: () => [], select: false },
  titleTerms: { type: [String], default: () => [], select: false },
};

/**
 * A STUDHub benefit — the student-leverage catalog. `type` splits three surfaces
 * sharing this collection:
 *   SCHOLARSHIP → verified funding (carries `deadline`)
 *   DISCOUNT    → software / tooling price cuts (carries `offer`, e.g. "50% off")
 *   PERK        → exclusive student access / credits
 * `provider` is the brand/organisation offering it; `claimUrl` is where the student redeems it.
 * Eligibility and long-form details are embedded rich text — no joins needed to render a card.
 */
export const studhubBenefitSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    type: { type: String, enum: STUDHUB_TYPES, required: true, default: 'PERK' },
    summary: { type: String, required: true },
    description: { type: String, default: null },
    thumbnailId: ref('MediaAsset'),
    provider: { type: String, default: null }, // brand offering the benefit, e.g. "GitHub"
    offer: { type: String, default: null }, // headline value, e.g. "50% off" or "$100 credit"
    eligibility: { type: String, default: null }, // who qualifies (short text)
    claimUrl: { type: String, default: null }, // where the student redeems / applies
    deadline: { type: Date, default: null }, // scholarships / limited perks
    tags: { type: [embeddedTagSchema], default: [] },
    status: { type: String, enum: PUBLISH_STATUSES, required: true, default: 'DRAFT' },
    publishedAt: { type: Date, default: null },
    featured: { type: Boolean, required: true, default: false },
    createdBy: ref('User'),
    updatedBy: ref('User'),
    ...searchFields,
  },
  { collection: 'studhub_benefits', timestamps: true },
);
studhubBenefitSchema.index({ slug: 1 }, { unique: true });
studhubBenefitSchema.index({ status: 1, type: 1, publishedAt: -1 });
studhubBenefitSchema.index({ status: 1, featured: 1, publishedAt: -1 });
studhubBenefitSchema.index({ 'tags.slug': 1 });
studhubBenefitSchema.index({ searchTerms: 1 });
studhubBenefitSchema.index({ updatedAt: -1 });
