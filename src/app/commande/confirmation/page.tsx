import type { Metadata } from 'next';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import OrderConfirmationClient from '@/components/OrderConfirmationClient';
import RiceWareNav from '@/components/RiceWareNav';

export const metadata: Metadata = {
  title: 'Commande reçue | RiceWare CI',
  description: 'Confirmation de demande de commande RiceWare CI.',
};

export default function OrderConfirmationPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-ground font-body text-ink">
      <RiceWareNav />
      <main className="flex-1">
        <section className="bg-ground py-section">
          <div className="mx-auto max-w-page px-5 sm:px-8">
            <Suspense fallback={<div className="rounded-[18px] border border-line bg-surface p-6">Chargement de la confirmation...</div>}>
              <OrderConfirmationClient />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
