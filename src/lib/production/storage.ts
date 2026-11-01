import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ProductionError } from '@/lib/production/validation';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type FileFormat = { extension: string; mimeType: string; matches: (bytes: Buffer) => boolean };

const FORMATS: FileFormat[] = [
  {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    extension: '.png',
    mimeType: 'image/png',
    matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    extension: '.webp',
    mimeType: 'image/webp',
    matches: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
  },
  {
    extension: '.gif',
    mimeType: 'image/gif',
    matches: (bytes) => bytes.toString('ascii', 0, 4) === 'GIF8',
  },
  {
    extension: '.pdf',
    mimeType: 'application/pdf',
    matches: (bytes) => bytes.toString('ascii', 0, 4) === '%PDF',
  },
];

const CONTENT_TYPE_BY_EXTENSION = Object.fromEntries(
  FORMATS.map((format) => [format.extension, format.mimeType]),
) as Record<string, string>;

const STORED_FILENAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp|gif|pdf)$/;

export const PRODUCTION_MEDIA_PREFIX = '/media/production/';

function getUploadDir(): string {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.PRODUCTION_UPLOAD_DIR || path.join('storage', 'uploads', 'production'),
  );
}

export type StoredProductionFile = {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
};

export async function storeProductionFile(file: File): Promise<StoredProductionFile> {
  if (file.size === 0) throw new ProductionError('Le fichier est vide.');
  if (file.size > MAX_FILE_BYTES) throw new ProductionError('Fichier trop lourd (10 Mo maximum).');

  const bytes = Buffer.from(await file.arrayBuffer());
  const format = FORMATS.find((candidate) => candidate.matches(bytes));
  if (!format) {
    throw new ProductionError('Format non pris en charge : JPEG, PNG, WebP, GIF ou PDF.');
  }

  const filename = `${crypto.randomUUID()}${format.extension}`;
  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ uploadDir, filename), bytes);

  return {
    filename,
    url: `${PRODUCTION_MEDIA_PREFIX}${filename}`,
    mimeType: format.mimeType,
    sizeBytes: bytes.byteLength,
    originalName: file.name,
  };
}

export async function readProductionFile(
  filename: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!STORED_FILENAME_PATTERN.test(filename)) return null;
  const extension = path.extname(filename).toLowerCase();

  try {
    const bytes = await fs.readFile(path.join(/*turbopackIgnore: true*/ getUploadDir(), filename));
    return { bytes, contentType: CONTENT_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

export async function removeProductionFile(filename: string): Promise<void> {
  if (!STORED_FILENAME_PATTERN.test(filename)) return;
  await fs.unlink(path.join(/*turbopackIgnore: true*/ getUploadDir(), filename)).catch(() => undefined);
}
