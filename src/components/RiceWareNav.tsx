import BrandMark from './BrandMark';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/site';

export default function RiceWareNav() {
  return (
    <header id="top" className="w-full bg-ground border-b border-line">
      <nav aria-label="Navigation principale" className="max-w-page mx-auto px-5 sm:px-8 flex items-center justify-between gap-4 h-[68px]">

        <a href="#top" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <BrandMark preload className="hidden min-[360px]:block h-9 sm:h-11 w-auto" />
          <span className="font-display font-bold text-paddy text-[18px] sm:text-[20px] whitespace-nowrap">
            RiceWare CI
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-ink hover:text-paddy transition-colors whitespace-nowrap">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/blog" className="flex items-center gap-2 font-semibold bg-paddy text-on-paddy px-3.5 sm:px-[18px] py-2 rounded-full text-sm hover:bg-paddy-deep transition-colors whitespace-nowrap">
            Blog
          </Link>
          <Link href="/boutique" className="flex items-center gap-2 font-semibold bg-husk text-ink px-2.5 sm:px-4 py-2 rounded-full text-sm hover:bg-husk-deep transition-colors whitespace-nowrap">
            Boutique
          </Link>
        </div>

      </nav>
    </header>
  );
}
