import { Schema } from 'mongoose';
import { CATEGORY_SCOPES } from './enums.js';

// One taxonomy collection shared by every content type, partitioned by `scope`.

export const categorySchema = new Schema(
  {
    scope: { type: String, enum: CATEGORY_SCOPES, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: null },
    displayOrder: { type: Number, required: true, default: 0 },
  },
  { collection: 'categories', timestamps: true },
);
categorySchema.index({ scope: 1, slug: 1 }, { unique: true });

/**
 * Controlled vocabulary for opportunity skills and resource tags. Content documents
 * embed `{ name, slug }` copies (read without joins); this collection is the master
 * list used by the admin UI and keeps slugs consistent.
 */

export const tagSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  { collection: 'tags', timestamps: true },
);
tagSchema.index({ slug: 1 }, { unique: true });

/** Embedded copy of a tag inside content documents. */
export const embeddedTagSchema = new Schema({ name: String, slug: String }, { _id: false });
