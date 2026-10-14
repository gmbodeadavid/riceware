import { NextResponse, connection } from 'next/server';
import { listPublicPosts } from '@/lib/data/blog';

/** Liste publique des articles visibles sur le site. */
export async function GET() {
  // Toujours lu à la demande : les articles programmés apparaissent sans rebuild.
  await connection();

  try {
    const posts = await listPublicPosts();

    return NextResponse.json(
      posts.map((post) => ({
        id: post.id,
        slug: post.slug,
        titre: post.title,
        categorie: post.categoryNames[0] ?? null,
        extrait: post.excerpt ?? null,
        imageCouverture: post.coverImage?.url ?? null,
        dureeLectureMinutes: post.readingTimeMinutes,
        publieLe: post.publishedAt,
      })),
    );
  } catch (error) {
    console.error('API articles – liste :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
