import Image from 'next/image';
import logo from '@/assets/logo.png';

// Decorative: always rendered next to the "RiceWare CI" wordmark, hence the empty alt.
// Size it with a height class plus w-auto so the artwork keeps its ratio.
export default function BrandMark({ className, preload }: { className?: string; preload?: boolean }) {
  return <Image src={logo} alt="" width={62} height={56} preload={preload} className={className} />;
}
