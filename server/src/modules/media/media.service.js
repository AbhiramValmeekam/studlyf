import { randomUUID } from 'node:crypto';
import { AppError } from '../../common/errors/app-error.js';
import { sniffImage } from '../../common/storage/image-sniff.js';

/**
 * Purposes a signed-in poster (organizer, HR, builder) may file an upload under. Deliberately
 * narrower than MEDIA_PURPOSES: LOGO/BANNER/THUMBNAIL/SCREENSHOT/AVATAR/OTHER are all content
 * a poster legitimately owns. DOCUMENT stays with the builder-only project route (private
 * storage + permission-checked download), and PARTNER_LOGO/ICON remain admin curation.
 */
export const CONTENT_MEDIA_PURPOSES = ['LOGO', 'BANNER', 'THUMBNAIL', 'SCREENSHOT', 'AVATAR', 'OTHER'];

/**
 * Store one uploaded image and record it as a MediaAsset. The type is decided by the file's
 * bytes, never by the client's filename or declared Content-Type — see sniffImage.
 * Shared by the admin console and the signed-in poster route so there is one storage path (§96).
 */
export async function storeImage(deps, userId, file, fields) {
  const { db, storage } = deps;
  if (!file) throw AppError.validation([{ field: 'file', message: 'An image file is required' }]);

  const image = sniffImage(file.buffer);
  if (!image) throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Only PNG, JPEG, WEBP and GIF images are accepted');

  const now = new Date();
  const key = `${fields.purpose.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${image.extension}`;
  const stored = await storage.put(key, file.buffer, image.mimeType);

  const row = await db.MediaAsset.create({
    driver: stored.driver,
    storageKey: stored.key,
    url: stored.url,
    mimeType: image.mimeType,
    sizeBytes: file.size,
    width: image.width ?? null,
    height: image.height ?? null,
    purpose: fields.purpose,
    originalName: file.originalname.slice(0, 200),
    altText: fields.altText ?? null,
    uploadedBy: userId,
  });
  return { row, key };
}

/** The shape every upload endpoint returns, so callers can treat an asset uniformly. */
export function assetView(a) {
  return {
    id: String(a._id),
    purpose: a.purpose,
    url: a.url,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    width: a.width ?? null,
    height: a.height ?? null,
    name: a.originalName ?? null,
    altText: a.altText ?? null,
  };
}
