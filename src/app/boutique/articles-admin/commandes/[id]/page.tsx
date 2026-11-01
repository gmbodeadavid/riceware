import OrderDetailClient from '@/components/boutique-admin/OrderDetailClient';

export default function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailClient params={params} />;
}
