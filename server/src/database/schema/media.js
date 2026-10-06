import { Schema } from 'mongoose';
import { MEDIA_DRIVERS, MEDIA_PURPOSES } from './enums.js';

// Files never live in the database — only their location and metadata.

export const mediaAssetSchema = new Schema(
  {
    driver: { type: String, enum: MEDIA_DRIVERS, required: true },
    storageKey: { type: String, default: null },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    purpose: { type: String, enum: MEDIA_PURPOSES, required: true, default: 'OTHER' },
    originalName: { type: String, default: null },
    altText: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'media_assets', timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);
mediaAssetSchema.index({ purpose: 1 });
mediaAssetSchema.index({ createdAt: -1 });
