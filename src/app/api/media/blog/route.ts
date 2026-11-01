import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { storeMedia } from '@/lib/blog/mediaStorage';
import { createMediaRecord, listMedia } from '@/lib/data/blog';

/** Liste les médias déjà importés (sert le sélecteur d’insertion dans l’éditeur). */
export async function GET(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'content:manage');
  if (rejection) return rejection;

  try {
    const media = await listMedia();
    return NextResponse.json(
      media.map((m) => ({
        id: m.id,
        url: m.url,
        mimeType: m.mimeType,
        altText: m.altText ?? null,
        type: m.type,
      })),
    );
  } catch (error) {
    console.error('API media – liste :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Importe un fichier média (image ou vidéo) et crée l’enregistrement associé. */
export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'content:manage');
  if (rejection) return rejection;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const altText = (formData.get('altText') as string) ?? undefined;
    const originalName = (formData.get('originalName') as string) ?? file?.name ?? 'fichier';

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier envoyé.' }, { status: 400 });
    }

    const stored = await storeMedia(file);
    const media = await createMediaRecord(stored, { originalName, altText });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error('API media – import :', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de l’import';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
