import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessAdmin } from '@/lib/admin-auth';
import { parseArticleInput } from '@/lib/blog/articleInput';
import { blogErrorResponse, readJsonBody } from '@/lib/blog/errors';
import { revalidateBlogPages } from '@/lib/blog/revalidate';
import { createPost, listAdminPosts } from '@/lib/data/blog';

export async function GET(request: NextRequest) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    return NextResponse.json(await listAdminPosts());
  } catch (error) {
    return blogErrorResponse(error, 'liste des articles');
  }
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const input = parseArticleInput(await readJsonBody(request));
    const post = await createPost(input);
    revalidateBlogPages();
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return blogErrorResponse(error, 'création d’article');
  }
}
