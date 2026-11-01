import { readProductionFile } from '@/lib/production/storage';

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { filename } = await params;
  const stored = await readProductionFile(filename);

  if (!stored) {
    return new Response('Fichier introuvable.', { status: 404 });
  }

  return new Response(new Uint8Array(stored.bytes), {
    headers: {
      'Content-Type': stored.contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    },
  });
}
