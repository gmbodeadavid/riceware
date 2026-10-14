import type { Metadata } from 'next';
import CheckoutClient from '@/components/CheckoutClient';
import Footer from '@/components/Footer';
import RiceWareNav from '@/components/RiceWareNav';

export const metadata: Metadata = {
  title: 'Commande | RiceWare CI',
  description: 'Finalisation de commande RiceWare CI.',
};

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-ground font-body text-ink">
      <RiceWareNav checkout />
      <main className="flex-1">
        <section className="bg-ground py-section">
          <div className="mx-auto max-w-page px-5 sm:px-8">
            <CheckoutClient showHeader={false} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
