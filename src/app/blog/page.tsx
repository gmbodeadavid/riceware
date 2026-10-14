import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';
import { listPublicPosts } from '@/lib/data/blog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | RiceWare CI',
  description: 'Les actualités et retours d’expérience de RiceWare CI.',
};

export default async function BlogPage() {
  await connection();
  const posts = await listPublicPosts();
  const featuredPost = posts.find((post) => post.isFeatured) ?? posts[0];
  const otherPosts = posts.filter((post) => post.id !== featuredPost?.id);

  return (
    <div className="min-h-screen w-full bg-ground font-body text-ink flex flex-col">
      <RiceWareNav />
      <main className="flex-1">
        <section className="bg-husk-soft py-section">
          <div className="max-w-page mx-auto px-5 sm:px-8">
            <div className="mx-auto max-w-[760px] text-center">
              <p className="font-mono-brand text-xs leading-4 tracking-[0.1em] uppercase text-paddy m-0">
                LE JOURNAL RICEWARE
              </p>
              <h1 className="mt-3 font-display text-title font-bold text-ink m-0">
                Blog <span className="text-paddy">RiceWare CI</span>
              </h1>
              <p className="mx-auto mt-4 max-w-[680px] text-base leading-7 text-ink-muted m-0">
                Actualités, réflexions et informations autour de la valorisation de la coque et de la paille de riz en Côte d’Ivoire.
              </p>
            </div>
          </div>
        </section>

        {featuredPost ? (
          <section className="bg-ground py-section">
            <div className="max-w-page mx-auto px-5 sm:px-8">
              <h2 className="mb-6 font-display text-xl font-semibold text-ink m-0 sm:text-2xl">
                À la une
              </h2>
              <div className="grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-2">
                <div className="order-2 flex flex-col items-start justify-center p-5 sm:p-8 md:order-1 lg:p-10">
                  <span className="inline-flex rounded-full bg-paddy/10 px-3 py-1 font-mono-brand text-[10px] uppercase tracking-[0.08em] text-paddy font-semibold">
                    Publié
                  </span>
                  <h3 className="mt-5 max-w-[520px] font-display text-2xl font-bold leading-tight text-ink m-0 sm:text-3xl">
                    {featuredPost.title}
                  </h3>
                  {featuredPost.excerpt && (
                    <p className="mt-4 max-w-[520px] text-sm leading-6 text-ink-muted m-0 sm:text-base sm:leading-7">
                      {featuredPost.excerpt}
                    </p>
                  )}
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-paddy transition-colors hover:text-paddy-deep"
                  >
                    Lire l&apos;article <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <div className="relative order-1 min-h-[240px] bg-surface sm:min-h-[320px] md:order-2 md:min-h-[380px]">
                  <Image
                    src={featuredPost.coverImage?.url ?? '/rice-hero.png'}
                    alt={featuredPost.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain p-5 sm:p-8"
                    preload
                  />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-ground py-section">
            <div className="max-w-page mx-auto px-5 sm:px-8">
              <h2 className="mb-6 font-display text-xl font-semibold text-ink m-0 sm:text-2xl">
                À la une
              </h2>
              <div className="grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-2">
                <div className="order-2 flex flex-col items-start justify-center p-5 sm:p-8 md:order-1 lg:p-10">
                  <span className="inline-flex rounded-full bg-husk-soft px-3 py-1 font-mono-brand text-[10px] uppercase tracking-[0.08em] text-husk-text">
                    À venir
                  </span>
                  <h3 className="mt-5 max-w-[520px] font-display text-2xl font-bold leading-tight text-ink m-0 sm:text-3xl">
                    Les premières publications RiceWare se préparent.
                  </h3>
                  <p className="mt-4 max-w-[520px] text-sm leading-6 text-ink-muted m-0 sm:text-base sm:leading-7">
                    Cette rubrique accueillera les actualités et contenus autour du projet RiceWare CI.
                  </p>
                  <Link href="/#procede" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-paddy transition-colors hover:text-paddy-deep">
                    Découvrir le projet <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <div className="relative order-1 min-h-[240px] bg-surface sm:min-h-[320px] md:order-2 md:min-h-[380px]">
                  <Image
                    src="/rice-hero.png"
                    alt="Épi de riz, coques et vaisselle RiceWare illustrant le projet"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain p-5 sm:p-8"
                    preload
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="bg-surface py-section">
          <div className="max-w-page mx-auto px-5 sm:px-8">
            <h2 className="font-display text-title font-bold text-ink m-0">
              Tous nos articles
            </h2>
            {otherPosts.length > 0 ? (
              <div className="mt-6 divide-y divide-line">
                {otherPosts.map((post) => (
                  <article key={post.id} className="py-6 sm:py-8 first:pt-0">
                    <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
                      <p className="font-mono-brand text-[11px] uppercase tracking-[0.08em] text-paddy m-0">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fr-FR') : 'Récent'}
                      </p>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-ink m-0 sm:text-xl">
                          <Link href={`/blog/${post.slug}`} className="hover:text-paddy transition-colors">
                            {post.title}
                          </Link>
                        </h3>
                        {post.excerpt && (
                          <p className="mt-2 max-w-[620px] text-sm leading-6 text-ink-muted m-0">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : !featuredPost ? (
              <div className="mt-6 border-y border-line py-6 sm:py-8">
                <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
                  <p className="font-mono-brand text-[11px] uppercase tracking-[0.08em] text-paddy m-0">
                    En préparation
                  </p>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink m-0 sm:text-xl">
                      Aucun article publié pour le moment.
                    </h3>
                    <p className="mt-2 max-w-[620px] text-sm leading-6 text-ink-muted m-0">
                      Les premières publications apparaîtront ici lorsqu’elles seront prêtes.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
