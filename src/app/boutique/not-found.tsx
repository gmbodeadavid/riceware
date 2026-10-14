import Link from 'next/link';

export default function BoutiqueNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground px-5 text-center">
      <p className="font-mono-brand text-xs uppercase tracking-[0.1em] text-ink-muted">Catalogue</p>
      <h1 className="mt-3 font-display text-title font-bold text-ink">Produit introuvable</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
        Le produit demandé n’est pas encore référencé dans le catalogue.
      </p>
      <Link href="/boutique" className="mt-6 inline-flex items-center justify-center rounded-full bg-paddy px-5 py-2.5 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep">
        Retour au catalogue
      </Link>
    </div>
  );
}
