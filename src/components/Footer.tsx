import BrandMark from './BrandMark';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="bg-paddy-deep text-on-paddy pt-8 sm:pt-9 pb-4">
      <div className="max-w-page mx-auto px-5 sm:px-8">

        {/* Main Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-6 mb-8">

          {/* Column 1 */}
          <div className="flex flex-col gap-2.5 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-0.5">
              {/* The logo's dark green leaves need a light tile to stay readable on the green footer. */}
              <div className="flex items-center justify-center size-10 bg-surface rounded-lg">
                <BrandMark className="h-8 w-auto" />
              </div>
              <span className="font-display font-bold text-on-paddy text-xl">
                RiceWare CI
              </span>
            </div>
            <p className="text-[14px] text-white/80 m-0 leading-relaxed max-w-[280px]">
              Des coques de riz aux assiettes compostables.
            </p>
            <p className="text-[14px] text-white/60 m-0">
              Abidjan, Côte d’Ivoire
            </p>
          </div>

          {/* Column 2 */}
          <nav aria-label="Navigation du pied de page" className="flex flex-col gap-2 items-start">
            <h4 className="font-mono-brand text-[11px] text-paddy-soft tracking-[0.08em] uppercase font-semibold mb-0.5">
              Navigation
            </h4>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-[14px] text-white/80 hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Column 3 */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/blog" className="px-2 py-2 text-[14px] font-semibold text-white/80 transition-colors hover:text-white">
              Blog
            </Link>
            <Link href="/boutique" className="inline-block rounded-md bg-husk px-5 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-husk-deep">
              Boutique
            </Link>
          </div>

        </div>

        <div className="border-t border-white/10 mb-4"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono-brand text-white/40 text-center">
          <p className="m-0">© 2025 RiceWare CI — Abidjan, Côte d’Ivoire</p>
          <p className="m-0">From rice husks to better tableware.</p>
        </div>

      </div>
    </footer>
  );
}
