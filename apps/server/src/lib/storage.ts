import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../env.js';

// S3-compatible storage interface — the local driver is the Phase 2 default;
// an S3 driver (putObject/getObject against an S3-compatible endpoint) can be
// dropped in later without touching callers.
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  url(key: string): string;
}

class LocalStorageDriver implements StorageDriver {
  constructor(private readonly dir: string) {}

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const filePath = path.join(this.dir, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  url(key: string): string {
    return `/uploads/${key}`;
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (!driver) {
    switch (env.STORAGE_DRIVER) {
      case 'local':
      default:
        driver = new LocalStorageDriver(env.UPLOADS_DIR);
    }
  }
  return driver;
}

export function newUploadKey(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-64);
  return `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safe}`;
}
