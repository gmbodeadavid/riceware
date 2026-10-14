import type { Metadata } from 'next';
import CheckoutClient from '@/components/CheckoutClient';
import RiceWareNav from '@/components/RiceWareNav';

export const metadata: Metadata = {
  title: 'Finaliser ma commande | RiceWare CI',
  description: 'Finalisez votre demande de commande RiceWare CI.',
};

export default function CartPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-ground font-body text-ink">
      <RiceWareNav />
      <main className="flex-1 bg-ground">
        <div className="mx-auto w-full max-w-3xl px-5 py-section sm:px-8">
          <CheckoutClient showHeader={false} compactLayout />
        </div>
      </main>
    </div>
  );
}
