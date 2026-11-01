import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { BlogInputError, blogErrorResponse } from '@/lib/blog/errors';
import { storeImage } from '@/lib/blog/mediaStorage';
import { createMediaRecord } from '@/lib/data/blog';

/** Import d’une image : champ `fichier` (obligatoire) et `alt` (texte alternatif). */
export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'content:manage');
  if (rejection) return rejection;

  try {
    const formData = await request.formData().catch(() => {
      throw new BlogInputError(['Formulaire d’import invalide.']);
    });
    const file = formData.get('fichier');
    if (!(file instanceof File) || file.size === 0) throw new BlogInputError(['Aucun fichier fourni.']);

    const altText = formData.get('alt');
    const image = await storeImage(file);
    const media = await createMediaRecord(image, {
      originalName: file.name,
      altText: typeof altText === 'string' ? altText.trim() : undefined,
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return blogErrorResponse(error, 'import d’image');
  }
}
