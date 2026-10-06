import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { sniffImage, sniffPdf } from '../../common/storage/image-sniff.js';
import { isActiveAdmin, projectAccess } from './access.js';
import { documentDownloadUrl } from './projects.hydrate.js';

const datedKey = (folder, ext) => {
  const now = new Date();
  return `projects/${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;
};

/**
 * Builder upload for project assets. The file type is decided by its bytes, never by the
 * client's filename or Content-Type:
 *   THUMBNAIL / SCREENSHOT → PNG/JPEG/WEBP/GIF, public storage (shown on project pages)
 *   DOCUMENT               → PDF, PRIVATE storage, streamed only after a permission check
 * The asset records its uploader; only the uploader can attach it to a project.
 */
export async function upload(deps, userId, file, purpose) {
  const { db, storage, privateStorage, config } = deps;
  if (!file) throw AppError.validation([{ field: 'file', message: 'Choose a file to upload' }]);

  if (purpose === 'DOCUMENT') {
    const pdf = sniffPdf(file.buffer);
    if (!pdf) throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Supporting documents must be PDF files.');
    const _id = new mongoose.Types.ObjectId();
    const key = datedKey('documents', pdf.extension);
    await privateStorage.put(key, file.buffer, pdf.mimeType);
    const doc = await db.MediaAsset.create({
      _id,
      driver: 'LOCAL',
      storageKey: key,
      url: documentDownloadUrl(config, String(_id)),
      mimeType: pdf.mimeType,
      sizeBytes: file.size,
      purpose: 'DOCUMENT',
      originalName: file.originalname.slice(0, 200),
      metadata: { private: true },
      uploadedBy: userId,
    });
    return assetView(doc.toObject());
  }

  const image = sniffImage(file.buffer);
  if (!image) throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Images must be PNG, JPEG, WEBP or GIF files.');
  const key = datedKey(purpose === 'THUMBNAIL' ? 'thumbnails' : 'screenshots', image.extension);
  const stored = await storage.put(key, file.buffer, image.mimeType);
  const doc = await db.MediaAsset.create({
    driver: stored.driver,
    storageKey: stored.key,
    url: stored.url,
    mimeType: image.mimeType,
    sizeBytes: file.size,
    width: image.width ?? null,
    height: image.height ?? null,
    purpose,
    originalName: file.originalname.slice(0, 200),
    uploadedBy: userId,
  });
  return assetView(doc.toObject());
}

function assetView(a) {
  return {
    id: String(a._id),
    purpose: a.purpose,
    url: a.url,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    width: a.width ?? null,
    height: a.height ?? null,
    name: a.originalName ?? null,
  };
}

/**
 * Stream a private project document if the caller may see a project that uses it (team,
 * admins, assigned evaluators, or anyone when that project is public/unlisted), or uploaded it.
 * Everyone else gets a 404, so a document's existence is never confirmed.
 */
export async function authorizeDownload(deps, viewerUserId, assetId) {
  const { db, privateStorage } = deps;
  const asset = await db.MediaAsset.findById(assetId).lean();
  if (!asset || asset.purpose !== 'DOCUMENT' || !asset.storageKey) throw AppError.notFound('Document');

  let allowed = !!viewerUserId && (String(asset.uploadedBy) === String(viewerUserId) || (await isActiveAdmin(db, viewerUserId)));
  if (!allowed) {
    const projects = await db.Project.find({ 'media.assetId': asset._id }).lean();
    for (const p of projects) {
      if ((await projectAccess(db, p, viewerUserId)).canView) {
        allowed = true;
        break;
      }
    }
  }
  if (!allowed && viewerUserId) {
    // Documents that only survive in a submission snapshot: the team and assigned evaluators.
    const subs = await db.ProjectSubmission.find({ 'projectSnapshot.media.assetId': asset._id }).select({ projectId: 1 }).lean();
    if (subs.length) {
      const [evaluator, member] = await Promise.all([
        db.Evaluation.exists({ submissionId: { $in: subs.map((s) => s._id) }, evaluatorId: viewerUserId }),
        db.ProjectMember.exists({ projectId: { $in: subs.map((s) => s.projectId) }, userId: viewerUserId, status: 'ACTIVE' }),
      ]);
      allowed = !!(evaluator || member);
    }
  }
  if (!allowed) throw AppError.notFound('Document');
  return {
    path: privateStorage.absolutePath(asset.storageKey),
    mimeType: asset.mimeType,
    filename: (asset.originalName ?? 'document.pdf').replace(/[^\w.\- ]+/g, '_'),
  };
}
