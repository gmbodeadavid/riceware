import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import { NAV_LINKS } from '@/lib/site';
import CartIcon from './CartIcon';
import NavLogo from './NavLogo';

export default function RiceWareNav({ checkout = false }: { checkout?: boolean }) {
  if (checkout) {
    return (
      <header id="top" className="sticky top-0 z-50 w-full border-b border-line bg-ground">
        <nav aria-label="Navigation de commande" className="mx-auto flex h-[68px] max-w-page items-center gap-3 px-5 sm:px-8">
          <Link
            href="/boutique"
            aria-label="Retour à la boutique"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-paddy hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
          >
            <LuArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="m-0 font-display text-title font-bold text-ink">Finaliser ma commande</h1>
        </nav>
      </header>
    );
  }

  return (
    <header id="top" className="sticky top-0 z-50 w-full bg-ground border-b border-line">
      <nav aria-label="Navigation principale" className="max-w-page mx-auto px-5 sm:px-8 flex items-center justify-between gap-4 h-[68px]">

        <NavLogo />

        <div className="hidden items-center gap-4 xl:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap text-sm font-medium text-ink transition-colors hover:text-paddy">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <details className="group relative xl:hidden">
            <summary aria-label="Ouvrir la navigation" title="Ouvrir la navigation" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-paddy hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 grid min-w-52 gap-1 rounded-lg border border-line bg-surface p-2 shadow-lg">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ground hover:text-paddy">
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/panier" className="relative inline-flex items-center justify-center whitespace-nowrap rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6h15l-2 12H7L4 3H2" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
            </svg>
            <CartIcon />
          </Link>
          <Link href="/boutique" className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-paddy px-3 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep sm:px-4">
            Boutique
          </Link>
        </div>

      </nav>
    </header>
  );
}