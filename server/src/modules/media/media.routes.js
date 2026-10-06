import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { MEDIA_PURPOSES } from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { AppError } from '../../common/errors/app-error.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { httpUrl, idParams, optionalText, paginationQuery, parse } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';
import { limiter } from '../../common/middleware/security.js';
import { recordAdminChange, recordAudit } from '../../common/utilities/admin-change.js';
import { CONTENT_MEDIA_PURPOSES, assetView as sharedAssetView, storeImage } from './media.service.js';

const uploadFields = z.object({
  purpose: enumParam(MEDIA_PURPOSES).default('OTHER'),
  altText: optionalText(200),
});

/** Signed-in posters may file content purposes only — no DOCUMENT (private PDFs) or curation kinds. */
const contentUploadFields = z.object({
  purpose: enumParam(CONTENT_MEDIA_PURPOSES).default('OTHER'),
  altText: optionalText(200),
});

const externalBody = z
  .object({
    url: httpUrl,
    purpose: z.enum(MEDIA_PURPOSES).default('OTHER'),
    mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    altText: optionalText(200),
    width: z.number().int().positive().max(20_000).optional(),
    height: z.number().int().positive().max(20_000).optional(),
  })
  .strict();

const mediaView = (m) => ({
  id: String(m._id),
  driver: m.driver,
  url: m.url,
  mimeType: m.mimeType,
  sizeBytes: m.sizeBytes,
  width: m.width,
  height: m.height,
  purpose: m.purpose,
  originalName: m.originalName,
  altText: m.altText,
  metadata: m.metadata,
  createdAt: m.createdAt,
});

/** No foreign keys in MongoDB: clear every reference to a deleted asset. */
async function detachMedia(db, id) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refs = [
    [db.User, ['profilePhotoId']],
    [db.Opportunity, ['organizationLogoId', 'bannerId']],
    [db.Job, ['bannerId']],
    [db.Resource, ['thumbnailId']],
    [db.Partner, ['logoId']],
    [db.Testimonial, ['photoId']],
    [db.PathCard, ['imageId']],
    [db.HomepageContent, ['content.backgroundImageId']],
  ];
  await Promise.all(refs.flatMap(([model, fields]) => fields.map((f) => model.updateMany({ [f]: id }, { $set: { [f]: null } }))));
}

export function mediaAdminRouter(deps) {
  const { db, storage, config } = deps;
  const r = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storage.maxUploadBytes, files: 1, fields: 5 },
  });

  r.get('/', async (req, res) => {
    const { page, pageSize } = parse(z.object(paginationQuery), req.query);
    const [rows, total] = await Promise.all([
      db.MediaAsset.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      db.MediaAsset.countDocuments(),
    ]);
    ok(res, rows.map(mediaView), pageMeta(page, pageSize, total));
  });

  /** multipart/form-data: file=<image>, purpose=LOGO|THUMBNAIL|…, altText=… */
  r.post('/', upload.single('file'), async (req, res) => {
    const fields = parse(uploadFields, req.body ?? {});
    const { row, key } = await storeImage(deps, req.auth.user.id, req.file, fields);
    await recordAdminChange(deps, req, { action: 'media.upload', entityType: 'media', entityId: String(row._id), changes: { key, size: req.file.size } });
    created(res, mediaView(row.toObject()));
  });

  /** Register an image already hosted elsewhere (CDN, existing site assets). */
  r.post('/external', async (req, res) => {
    const body = parse(externalBody, req.body);
    const row = await db.MediaAsset.create({
      driver: 'EXTERNAL',
      url: body.url,
      mimeType: body.mimeType,
      purpose: body.purpose,
      altText: body.altText ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
      uploadedBy: req.auth.user.id,
    });
    await recordAdminChange(deps, req, { action: 'media.register_external', entityType: 'media', entityId: String(row._id), changes: body });
    created(res, mediaView(row.toObject()));
  });

  r.delete('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const row = await db.MediaAsset.findByIdAndDelete(id).lean();
    if (!row) throw AppError.notFound('Media');
    await detachMedia(db, id);
    if (row.driver === storage.driver && row.storageKey) await storage.delete(row.storageKey);
    await recordAdminChange(deps, req, { action: 'media.delete', entityType: 'media', entityId: id });
    ok(res, { id });
  });

  return r;
}

/**
 * Signed-in image upload for posters (organizer, HR, builder). Mounted in the authenticated
 * /api/v1 group, never under /admin and never in the cacheable public group. Any ACTIVE account
 * may upload; the asset records who did. Ownership is enforced at *use* time — an uploaded asset
 * only becomes publicly visible once a serializer references it.
 */
export function mediaUploadRouter(deps) {
  const { config } = deps;
  const r = Router();
  const on = config.rateLimit.enabled;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storage.maxUploadBytes, files: 1, fields: 5 },
  });

  r.post(
    '/media/upload',
    requireAuth,
    limiter(on, { windowMs: 60 * 60 * 1000, limit: 60 }),
    upload.single('file'),
    async (req, res) => {
      const fields = parse(contentUploadFields, req.body ?? {});
      const { row } = await storeImage(deps, req.auth.user.id, req.file, fields);
      await recordAudit(deps, req, {
        action: 'media.upload',
        entityType: 'media',
        entityId: String(row._id),
        changes: { purpose: fields.purpose, size: req.file.size },
      });
      created(res, sharedAssetView(row.toObject()));
    },
  );

  return r;
}
