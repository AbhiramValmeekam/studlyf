import { Schema } from 'mongoose';

/**
 * Master skill vocabulary (10–20 admin-managed rows). Builder profiles embed
 * `{ skillId, slug, name, proficiency }` copies (read without joins); this collection
 * keeps slugs consistent and is what opportunity skill tags are aligned against, so
 * recommendations can match `builderProfile.skills[].slug` to `opportunity.skills[].slug`.
 */
export const skillSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    category: { type: String, default: null },
    description: { type: String, default: null },
    active: { type: Boolean, required: true, default: true },
  },
  { collection: 'skills', timestamps: true },
);
skillSchema.index({ slug: 1 }, { unique: true });
skillSchema.index({ active: 1, name: 1 });
