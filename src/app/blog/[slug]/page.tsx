import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import Link from 'next/link';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';
import { getPublicPost, incrementPostViews } from '@/lib/data/blog';
import type { AnyBlogBlock } from '@/lib/ricewareModels';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(slug);

  if (!post) {
    return { title: 'Article non trouvé | RiceWare CI' };
  }

  return {
    title: `${post.seoTitle || post.title} | RiceWare CI`,
    description: post.seoDescription || post.excerpt || 'Article du journal RiceWare CI',
  };
}

export default async function BlogPostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const post = await getPublicPost(slug);

  if (!post) {
    notFound();
  }

  await incrementPostViews(slug);

  return (
    <div className="min-h-screen w-full bg-ground font-body text-ink flex flex-col">
      <RiceWareNav />
      <main className="flex-1">
        <article className="py-section">
          <div className="max-w-[760px] mx-auto px-5 sm:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-paddy hover:text-paddy-deep transition-colors mb-6"
            >
              ← Retour au journal
            </Link>

            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-brand uppercase tracking-[0.08em] text-ink-muted">
                {post.publishedAt && (
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {post.readingTimeMinutes && (
                  <>
                    <span>•</span>
                    <span>{post.readingTimeMinutes} min de lecture</span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink leading-tight">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-lg leading-relaxed text-ink-muted">
                  {post.excerpt}
                </p>
              )}
            </header>

            <div className="my-8 border-b border-line" />

            {/* Content blocks renderer */}
            <div className="max-w-[65ch] space-y-6">
              {post.content.map((block: AnyBlogBlock) => {
                if (block.type === 'paragraph') {
                  return (
                    <p
                      key={block.id}
                      className="text-base sm:text-lg leading-relaxed text-ink/90 whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: block.content.text.replace(/\n/g, '<br />') }}
                    />
                  );
                }
                if (block.type === 'heading') {
                  const content = block.content as { text?: string; level?: number };
                  const Tag = content.level === 3 ? 'h3' : content.level === 4 ? 'h4' : 'h2';
                  return (
                    <Tag
                      key={block.id}
                      className="mt-8 mb-4 font-display text-xl font-bold text-ink sm:text-2xl"
                      dangerouslySetInnerHTML={{ __html: content.text ?? '' }}
                    />
                  );
                }
                if (block.type === 'quote') {
                  const content = block.content as { text?: string; author?: string };
                  return (
                    <blockquote key={block.id} className="border-l-4 border-paddy pl-4 italic text-ink-muted my-6">
                      <p dangerouslySetInnerHTML={{ __html: content.text?.replace(/\n/g, '<br />') ?? '' }} />
                      {content.author && <cite className="block not-italic text-sm font-semibold mt-2">— {content.author}</cite>}
                    </blockquote>
                  );
                }
                if (block.type === 'callout') {
                  const content = block.content as { text?: string; variant?: string; title?: string };
                  return (
                    <aside key={block.id} className={`rounded border p-4 my-6 text-ink callout callout-${content.variant ?? 'info'}`}>
                      {content.title && <strong className="block mb-2 font-semibold">{content.title}</strong>}
                      <p dangerouslySetInnerHTML={{ __html: content.text?.replace(/\n/g, '<br />') ?? '' }} />
                    </aside>
                  );
                }
                if (block.type === 'image') {
                  const content = block.content as { mediaId?: string; caption?: string };
                  const image = post.media[content.mediaId ?? ''];
                  if (!image) return null;
                  return (
                    <figure key={block.id} className="my-6 text-center">
                      <img
                        src={image.url}
                        alt={image.altText ?? ((block.content as { text?: string }).text ?? '')}
                        loading="lazy"
                        className="max-w-full h-auto rounded border border-line mx-auto"
                      />
                      {content.caption && <figcaption className="mt-2 text-sm text-ink-muted">{content.caption}</figcaption>}
                    </figure>
                  );
                }
                if (block.type === 'video') {
                  const content = block.content as { mediaId?: string; caption?: string; autoplay?: boolean; loop?: boolean; muted?: boolean };
                  const video = post.media[content.mediaId ?? ''];
                  if (!video) return null;
                  return (
                    <figure key={block.id} className="my-6 text-center">
                      <video
                        controls
                        autoPlay={content.autoplay ?? false}
                        loop={content.loop ?? false}
                        muted={content.muted ?? true}
                        src={video.url}
                        className="max-w-full h-auto rounded border border-line mx-auto"
                      />
                      {content.caption && <figcaption className="mt-2 text-sm text-ink-muted">{content.caption}</figcaption>}
                    </figure>
                  );
                }
                if (block.type === 'divider') {
                  return <hr key={block.id} className="my-8 border border-line" />;
                }
                return null;
              })}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
