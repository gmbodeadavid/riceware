import { NextResponse, type NextRequest } from 'next/server';
import { requireBlogSession } from '@/lib/blog-admin-auth';
import { BlogInputError, blogErrorResponse } from '@/lib/blog/errors';
import { storeMedia } from '@/lib/blog/mediaStorage';
import { createMediaRecord, listMedia } from '@/lib/data/blog';

export async function GET(request: NextRequest) {
  const rejection = requireBlogSession(request);
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listMedia());
  } catch (error) {
    return blogErrorResponse(error, 'liste des medias');
  }
}

export async function POST(request: NextRequest) {
  const rejection = requireBlogSession(request);
  if (rejection) return rejection;

  try {
    const formData = await request.formData().catch(() => {
      throw new BlogInputError(['Formulaire import invalide.']);
    });
    const file = formData.get('fichier');
    if (!(file instanceof File) || file.size === 0) throw new BlogInputError(['Aucun fichier fourni.']);

    const altText = formData.get('alt');
    const stored = await storeMedia(file);
    const media = await createMediaRecord(stored, {
      originalName: file.name,
      altText: typeof altText === 'string' ? altText.trim() : undefined,
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return blogErrorResponse(error, 'import de media');
  }
}
