import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';

export const metadata: Metadata = {
  title: 'Boutique | RiceWare CI',
  description: 'La boutique RiceWare CI, bientôt disponible.',
};

export default function BoutiquePage() {
  return (
    <div className="min-h-screen w-full bg-ground font-body text-ink flex flex-col">
      <RiceWareNav />
      <main className="flex-1">
        <section className="bg-ground py-section">
          <div className="max-w-page mx-auto px-5 sm:px-8">
            <p className="font-mono-brand text-xs leading-4 tracking-[0.08em] uppercase text-husk-text m-0">
              BOUTIQUE
            </p>
            <div className="mt-3 grid gap-4 border-b border-line pb-8 md:grid-cols-[1fr_360px] md:items-end md:gap-10">
              <h1 className="font-display text-title font-bold text-ink m-0 max-w-[680px]">
                La gamme RiceWare.
              </h1>
              <p className="text-sm leading-[22px] text-ink-muted m-0 max-w-[420px]">
                Assiettes, fourchettes et autres produits fabriqués à partir de coques de riz.
              </p>
            </div>

            <div className="grid gap-5 border-b border-line py-8 sm:grid-cols-[160px_1fr] sm:gap-8">
              <p className="font-mono-brand text-xs uppercase tracking-[0.06em] text-husk-text m-0">
                Disponibilité
              </p>
              <div>
                <h2 className="font-display text-xl font-semibold text-ink m-0">
                  Aucun produit disponible pour le moment.
                </h2>
                <p className="text-sm leading-[22px] text-ink-muted mt-2 mb-0 max-w-[600px]">
                  Les premiers produits seront présentés ici dès qu’ils seront prêts.
                </p>
                <Link href="/" className="inline-flex mt-5 font-semibold text-sm text-paddy hover:text-paddy-deep transition-colors">
                  Retour au site <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}