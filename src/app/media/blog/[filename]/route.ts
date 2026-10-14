import { readStoredImage } from '@/lib/blog/mediaStorage';

/** Sert les images importées depuis l’admin du blog. */
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const image = await readStoredImage(filename);

  if (!image) {
    return new Response('Image introuvable', { status: 404 });
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'Content-Type': image.contentType,
      'Content-Length': String(image.bytes.byteLength),
      // Les noms de fichiers sont des UUID : le contenu ne change jamais.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
