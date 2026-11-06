import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listStocks, listStockMovements } from '@/lib/production/queries';
import { labelOf, PRODUCT_TYPES, STOCK_ITEM_TYPES, STOCK_MOVEMENT_TYPES } from '@/lib/production/types';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function StocksPage() {
  const session = await requireAdminPage('stocks:view');
  const [stocks, movements] = await Promise.all([listStocks(), listStockMovements(80)]);
  const canWrite = can(session.role, 'stocks:write');
  const lowStocks = stocks.filter((stock) => stock.minThreshold > 0 && stock.quantity <= stock.minThreshold);
  const rawMaterials = stocks.filter((stock) => stock.itemType !== 'produit_fini');
  const finished = stocks.filter((stock) => stock.itemType === 'produit_fini');

  return (
    <div>
      <PageHeader
        title="Gestion des stocks"
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Stocks' }]}
      />

      {/* Barre d'actions : exports à gauche · écriture à droite */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LinkButton href="/api/admin/exports/stocks?format=pdf" target="_blank">Inventaire PDF</LinkButton>
          <LinkButton href="/api/admin/exports/stocks?format=csv" target="_blank">CSV</LinkButton>
          <LinkButton href="/api/admin/exports/stocks?format=xls" target="_blank">Excel</LinkButton>
        </div>
        {canWrite ? (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/stocks/mouvement"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-husk px-4 py-2 text-sm font-semibold text-on-husk transition-colors hover:bg-husk-deep"
            >
              + Enregistrer un mouvement
            </Link>
            <Link
              href="/admin/stocks/nouveau"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
            >
              + Ajouter une référence
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Références" value={stocks.length} hint={`${rawMaterials.length} matières · ${finished.length} produits finis`} />
        <StatCard label="Alertes seuil" value={lowStocks.length} tone={lowStocks.length ? 'warning' : 'default'} hint={lowStocks.length ? 'À réapprovisionner' : 'Seuils respectés'} />
        <StatCard label="Coques" value={formatNumber(stocks.filter((stock) => stock.itemType === 'coques').reduce((total, stock) => total + stock.quantity, 0), 'kg')} tone="paddy" />
        <StatCard label="Produits finis" value={formatNumber(finished.reduce((total, stock) => total + stock.quantity, 0), 'unités')} />
      </div>

      {lowStocks.length ? (
        <div className="mt-4 rounded-panel border border-husk-deep/30 bg-husk-soft/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-husk-text">Sous le seuil minimum</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {lowStocks.map((stock) => (
              <li key={stock.id} className="flex items-center justify-between gap-2 rounded-control bg-surface/70 px-3 py-1.5 text-sm">
                <span>{stock.label}</span>
                <span className="font-mono-brand text-xs font-semibold">{formatNumber(stock.quantity, stock.unit)} / {formatNumber(stock.minThreshold, stock.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <Section title="Inventaire">
          {stocks.length === 0 ? (
            <EmptyState title="Aucune référence" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">Type</th>
                    <th className="px-3 py-2 font-semibold">Libellé</th>
                    <th className="px-3 py-2 font-semibold">Quantité</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Seuil</th>
                    <th className="px-3 py-2 font-semibold hidden lg:table-cell">Emplacement</th>
                    <th className="px-3 py-2 font-semibold hidden lg:table-cell">Dernier mouvement</th>
                    <th className="px-3 py-2 font-semibold">Alerte</th>
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {stocks.map((stock) => {
                    const low = stock.minThreshold > 0 && stock.quantity <= stock.minThreshold;
                    return (
                      <tr key={stock.id} className="group transition-colors hover:bg-paddy/[0.03]">
                        <td className="px-3 py-2 align-middle text-xs text-ink-muted hidden sm:table-cell">
                          {labelOf(STOCK_ITEM_TYPES, stock.itemType)}
                          {stock.productType ? <><br /><span className="opacity-70">{labelOf(PRODUCT_TYPES, stock.productType)}</span></> : ''}
                        </td>
                        <td className="px-3 py-2 align-middle font-medium">{stock.label}</td>
                        <td className="px-3 py-2 align-middle font-mono-brand text-xs font-semibold whitespace-nowrap">{formatNumber(stock.quantity, stock.unit)}</td>
                        <td className="px-3 py-2 align-middle text-ink-muted hidden md:table-cell whitespace-nowrap">{formatNumber(stock.minThreshold, stock.unit)}</td>
                        <td className="px-3 py-2 align-middle text-ink-muted text-xs hidden lg:table-cell">{stock.location ?? '—'}</td>
                        <td className="px-3 py-2 align-middle text-xs text-ink-muted hidden lg:table-cell">
                          {stock.movements[0] ? (
                            <>
                              <span className="whitespace-nowrap">{formatDateTime(stock.movements[0].createdAt)}</span>
                              <br />
                              <span className={`font-mono-brand font-semibold ${stock.movements[0].quantity >= 0 ? 'text-paddy-deep' : 'text-danger'}`}>
                                {stock.movements[0].quantity > 0 ? '+' : ''}{formatNumber(stock.movements[0].quantity, stock.unit)}
                              </span>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 align-middle"><Badge tone={low ? 'warning' : 'success'}>{low ? 'Sous seuil' : 'OK'}</Badge></td>
                        <td className="px-3 py-2 align-middle hidden sm:table-cell">
                          {canWrite ? <DeleteButton endpoint={`/api/admin/stocks/${stock.id}`} confirmation={`Supprimer la référence ${stock.label} ?`} label="Suppr." /> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <div className="mt-5">
        <Section title="Derniers mouvements">
          {movements.length === 0 ? (
            <EmptyState title="Aucun mouvement" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ground/40 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Stock</th>
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">Type</th>
                    <th className="px-3 py-2 font-semibold">Mouvement</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Solde</th>
                    <th className="px-3 py-2 font-semibold hidden lg:table-cell">Référence</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Auteur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="group transition-colors hover:bg-paddy/[0.03]">
                      <td className="px-3 py-2 align-middle text-xs text-ink-muted whitespace-nowrap">{formatDateTime(movement.createdAt)}</td>
                      <td className="px-3 py-2 align-middle text-sm">{movement.stock.label}</td>
                      <td className="px-3 py-2 align-middle text-xs text-ink-muted hidden sm:table-cell">{labelOf(STOCK_MOVEMENT_TYPES, movement.type)}</td>
                      <td className={`px-3 py-2 align-middle font-mono-brand text-xs font-semibold whitespace-nowrap ${movement.quantity < 0 ? 'text-danger' : 'text-paddy-deep'}`}>
                        {movement.quantity > 0 ? '+' : ''}{formatNumber(movement.quantity, movement.stock.unit)}
                      </td>
                      <td className="px-3 py-2 align-middle hidden md:table-cell font-mono-brand text-xs">{formatNumber(movement.resultingQuantity, movement.stock.unit)}</td>
                      <td className="px-3 py-2 align-middle text-xs text-ink-muted hidden lg:table-cell">{movement.reference ?? '—'}</td>
                      <td className="px-3 py-2 align-middle text-xs text-ink-muted hidden md:table-cell">{movement.createdBy?.name ?? 'système'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
