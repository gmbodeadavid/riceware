import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessAdmin } from '@/lib/admin-auth';
import { parseArticleInput } from '@/lib/blog/articleInput';
import { BlogInputError, BlogNotFoundError, blogErrorResponse, readJsonBody } from '@/lib/blog/errors';
import { revalidateBlogPages } from '@/lib/blog/revalidate';
import { isQuickStatus } from '@/lib/blog/status';
import { deletePost, getArticleEditorData, updatePost, updatePostStatus } from '@/lib/data/blog';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const article = await getArticleEditorData(id);
    if (!article) throw new BlogNotFoundError();
    return NextResponse.json(article);
  } catch (error) {
    return blogErrorResponse(error, 'lecture d’article');
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const input = parseArticleInput(await readJsonBody(request));
    const post = await updatePost(id, input);
    revalidateBlogPages();
    return NextResponse.json(post);
  } catch (error) {
    return blogErrorResponse(error, 'mise à jour d’article');
  }
}

/** Changement de statut rapide : `{ "status": "draft" | "published" | "archived" }`. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const status = typeof body === 'object' && body !== null ? (body as { status?: unknown }).status : undefined;
    if (!isQuickStatus(status)) throw new BlogInputError(['Statut non autorisé.']);

    const post = await updatePostStatus(id, status);
    revalidateBlogPages();
    return NextResponse.json(post);
  } catch (error) {
    return blogErrorResponse(error, 'changement de statut');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const rejection = rejectUnlessAdmin(request);
  if (rejection) return rejection;

  try {
    const { id } = await params;
    await deletePost(id);
    revalidateBlogPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return blogErrorResponse(error, 'suppression d’article');
  }
}
