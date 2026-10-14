import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BlogInputError } from '@/lib/blog/errors';
import { MAX_IMAGE_BYTES } from '@/lib/blog/limits';

/**
 * Les images du blog sont stockées hors de `public/` : Next.js ne sert en
 * production que les fichiers présents dans `public/` au moment du build.
 * Elles sont servies par la route `/media/blog/[filename]`.
 */
export const MEDIA_ROUTE_PREFIX = '/media/blog/';

type ImageFormat = { extension: string; matches: (bytes: Buffer) => boolean };

const IMAGE_FORMATS: Record<string, ImageFormat> = {
  'image/jpeg': {
    extension: '.jpg',
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extension: '.png',
    matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    extension: '.webp',
    matches: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
  },
  'image/gif': {
    extension: '.gif',
    matches: (bytes) => bytes.toString('ascii', 0, 4) === 'GIF8',
  },
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_FORMATS).map(([mimeType, format]) => [format.extension, mimeType]),
);

const STORED_FILENAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

function getUploadDir(): string {
  return path.resolve(process.cwd(), process.env.BLOG_UPLOAD_DIR || path.join('storage', 'uploads', 'blog'));
}

export type StoredImage = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

export async function storeImage(file: File): Promise<StoredImage> {
  const format = IMAGE_FORMATS[file.type];
  if (!format) throw new BlogInputError(['Format non pris en charge : JPEG, PNG, WebP ou GIF.']);
  if (file.size > MAX_IMAGE_BYTES) throw new BlogInputError(['Image trop lourde (5 Mo maximum).']);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!format.matches(bytes)) throw new BlogInputError(['Le contenu du fichier ne correspond pas à une image valide.']);

  const filename = `${crypto.randomUUID()}${format.extension}`;
  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), bytes);

  return { filename, mimeType: file.type, sizeBytes: bytes.byteLength, url: `${MEDIA_ROUTE_PREFIX}${filename}` };
}

export async function readStoredImage(filename: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!STORED_FILENAME_PATTERN.test(filename)) return null;

  try {
    const bytes = await fs.readFile(path.join(getUploadDir(), filename));
    return { bytes, contentType: CONTENT_TYPE_BY_EXTENSION[path.extname(filename)] };
  } catch {
    return null;
  }
}

export async function removeStoredImage(filename: string): Promise<void> {
  if (!STORED_FILENAME_PATTERN.test(filename)) return;
  await fs.unlink(path.join(getUploadDir(), filename)).catch(() => undefined);
}
