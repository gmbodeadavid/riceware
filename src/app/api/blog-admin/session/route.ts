import { NextResponse, type NextRequest } from 'next/server';
import { getBlogSessionFromRequest } from '@/lib/blog-admin-auth';

export async function GET(request: NextRequest) {
  const session = getBlogSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
