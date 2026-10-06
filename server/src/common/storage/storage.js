import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Object storage abstraction. `LocalDiskStorage` serves development; an S3/R2
 * driver implements the same three methods (PutObject / DeleteObject / public URL)
 * and is selected via STORAGE_DRIVER without touching the media module.
 */
export class LocalDiskStorage {
  driver = 'LOCAL';

  constructor(
    uploadDir,
    baseUrl,
  ) {
    this.baseUrl = baseUrl;
    this.root = path.resolve(process.cwd(), uploadDir);
  }

  resolve(key) {
    const full = path.resolve(this.root, key);
    // keys are server-generated, but refuse path traversal regardless
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key, body) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body, { flag: 'wx' });
    return { driver: this.driver, key, url: this.publicUrl(key) };
  }

  async delete(key) {
    await rm(this.resolve(key), { force: true });
  }

  publicUrl(key) {
    return `${this.baseUrl}/${key}`;
  }

  /** Absolute path for streaming a stored object (private files are sent via an authorised route). */
  absolutePath(key) {
    return this.resolve(key);
  }
}

/**
 * Private object storage for files that must be permission-checked on every read (project
 * documents). Same driver contract, but its root is NOT mounted as a static directory — files
 * are streamed by an authorised API route. An S3/R2 driver would use a private bucket + short-lived
 * signed URLs instead.
 */
export class PrivateLocalDiskStorage extends LocalDiskStorage {
  constructor(privateDir) {
    super(privateDir, null);
  }

  publicUrl() {
    return null;
  }
}

export function createPrivateStorage(config) {
  return new PrivateLocalDiskStorage(config.storage.privateUploadDir);
}

export function createStorage(config) {
  return new LocalDiskStorage(config.storage.uploadDir, config.storage.publicBaseUrl);
}
