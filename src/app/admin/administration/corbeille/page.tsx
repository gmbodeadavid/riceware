import { requireAdminPage } from '@/lib/admin-guard';
import { listDeletedItems } from '@/lib/production/queries';
import { PageHeader } from '@/components/admin/ui';
import CorbeilleClient from '@/components/admin/CorbeilleClient';

export default async function CorbeilleAdminPage() {
  await requireAdminPage('trash:manage');
  const items = await listDeletedItems();

  const groups = [
    {
      model: 'rizerie',
      label: 'Rizeries',
      canRestore: true,
      items: items.rizeries.map((r) => ({
        id: r.id,
        display: r.name,
        deletedAt: r.deletedAt!,
      })),
    },
    {
      model: 'lotCoques',
      label: 'Lots de coques',
      canRestore: true,
      items: items.lots.map((l) => ({
        id: l.id,
        display: `${l.code} — ${l.rizerie.name} (${l.netWeightKg} kg)`,
        deletedAt: l.deletedAt!,
      })),
    },
    {
      model: 'batchProduction',
      label: 'Batches de production',
      canRestore: false, // Bloqué en P1 (mouvements de stock inverses déjà créés)
      items: items.batches.map((b) => ({
        id: b.id,
        display: `${b.code} — ${b.piecesProduced} pièces`,
        deletedAt: b.deletedAt!,
      })),
    },
    {
      model: 'produitFini',
      label: 'Produits finis',
      canRestore: true,
      items: items.produitsFinis.map((p) => ({
        id: p.id,
        display: `${p.type} — ${p.weightG} g (${p.status})`,
        deletedAt: p.deletedAt!,
      })),
    },
    {
      model: 'stock',
      label: 'Références de stock',
      canRestore: true,
      items: items.stocks.map((s) => ({
        id: s.id,
        display: `${s.label} (${s.itemType})`,
        deletedAt: s.deletedAt!,
      })),
    },
    {
      model: 'partner',
      label: 'Partenaires',
      canRestore: true,
      items: items.partenaires.map((p) => ({
        id: p.id,
        display: `${p.name} (${p.type})`,
        deletedAt: p.deletedAt!,
      })),
    },
    {
      model: 'document',
      label: 'Documents',
      canRestore: true,
      items: items.documents.map((d) => ({
        id: d.id,
        display: `${d.name} (${d.category})`,
        deletedAt: d.deletedAt!,
      })),
    },
    {
      model: 'customer',
      label: 'Clients',
      canRestore: true,
      items: items.clients.map((c) => ({
        id: c.id,
        display: `${c.fullName} — ${c.phone}`,
        deletedAt: c.deletedAt!,
      })),
    },
    {
      model: 'order',
      label: 'Commandes',
      canRestore: true,
      items: items.commandes.map((o) => ({
        id: o.id,
        display: `${o.orderNumber} — ${o.totalAmount} FCFA`,
        deletedAt: o.deletedAt!,
      })),
    },
  ];

  const totalDeleted = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Éléments supprimés"
        description={
          totalDeleted > 0
            ? `${totalDeleted} élément(s) dans la corbeille. Les batches supprimés ne sont pas restaurables en P1.`
            : 'La corbeille est vide.'
        }
      />
      <CorbeilleClient groups={groups} />
    </div>
  );
}
