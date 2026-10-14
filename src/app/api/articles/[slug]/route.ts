import { NextResponse } from 'next/server';
import { blocksToHtml } from '@/lib/blog/html';
import { getPublicPost } from '@/lib/data/blog';

/** Détail public d’un article, contenu converti en HTML échappé. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await getPublicPost(slug);

    if (!post) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      id: post.id,
      slug: post.slug,
      titre: post.title,
      categorie: post.categoryNames[0] ?? null,
      extrait: post.excerpt ?? null,
      contenuHtml: blocksToHtml(post.content, post.media),
      imageCouverture: post.coverImage?.url ?? null,
      dureeLectureMinutes: post.readingTimeMinutes,
      publieLe: post.publishedAt,
    });
  } catch (error) {
    console.error('API articles – détail :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
