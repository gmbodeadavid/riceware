'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BrandMark from './BrandMark';

export default function NavLogo() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <Link href="/" onClick={handleClick} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
      <BrandMark preload className="hidden min-[360px]:block h-9 sm:h-11 w-auto" />
      <span className="font-display font-bold text-paddy text-[18px] sm:text-[20px] whitespace-nowrap">
        RiceWare CI
      </span>
    </Link>
  );
}
