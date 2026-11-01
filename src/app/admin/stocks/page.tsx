import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { listStocks, listStockMovements } from '@/lib/production/queries';
import { labelOf, PRODUCT_TYPES, STOCK_ITEM_TYPES, STOCK_MOVEMENT_TYPES } from '@/lib/production/types';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import { StockMovementForm, StockCreateForm } from '@/components/admin/StockForm';
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
        description="Coques, poudre, liant et produits finis. Chaque mouvement est historisé et les seuils déclenchent des alertes."
        actions={
          <>
            <LinkButton href="/api/admin/exports/stocks?format=pdf" target="_blank">Inventaire PDF</LinkButton>
            <LinkButton href="/api/admin/exports/stocks?format=csv" target="_blank">CSV</LinkButton>
            <LinkButton href="/api/admin/exports/stocks?format=xls" target="_blank">Excel</LinkButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Références suivies" value={stocks.length} hint={`${rawMaterials.length} matières / intrants · ${finished.length} produits finis`} />
        <StatCard label="Alertes de seuil" value={lowStocks.length} tone={lowStocks.length ? 'warning' : 'default'} hint={lowStocks.length ? 'Réapprovisionnement à planifier' : 'Tous les seuils sont respectés'} />
        <StatCard label="Coques disponibles" value={formatNumber(stocks.filter((stock) => stock.itemType === 'coques').reduce((total, stock) => total + stock.quantity, 0), 'kg')} tone="paddy" />
        <StatCard label="Produits finis disponibles" value={formatNumber(finished.reduce((total, stock) => total + stock.quantity, 0), 'unités')} />
      </div>

      {lowStocks.length ? (
        <div className="mt-5 rounded-panel border border-husk-deep/30 bg-husk-soft/60 p-4">
          <p className="text-sm font-semibold text-husk-text">Stocks sous le seuil minimum</p>
          <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {lowStocks.map((stock) => (
              <li key={stock.id} className="flex items-center justify-between gap-2 rounded-control bg-surface/70 px-3 py-2">
                <span>{stock.label}</span>
                <span className="font-mono-brand text-xs font-semibold">{formatNumber(stock.quantity, stock.unit)} / {formatNumber(stock.minThreshold, stock.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canWrite ? (
        <div className="mt-5 space-y-5">
          <StockMovementForm
            stocks={stocks.map((stock) => ({
              id: stock.id,
              label: stock.label,
              quantity: stock.quantity,
              unit: stock.unit,
              itemType: stock.itemType,
              productType: stock.productType,
            }))}
          />
          <StockCreateForm />
        </div>
      ) : null}

      <div className="mt-6">
        <Section title="Inventaire" description="État courant des références de stock.">
          {stocks.length === 0 ? (
            <EmptyState title="Aucune référence" description="Ajoutez une référence de stock ou enregistrez un lot de coques." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Libellé</th>
                    <th className="pb-2 pr-3">Quantité</th>
                    <th className="pb-2 pr-3">Seuil</th>
                    <th className="pb-2 pr-3">Emplacement</th>
                    <th className="pb-2 pr-3">Dernier mouvement</th>
                    <th className="pb-2 pr-3">Alerte</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => {
                    const low = stock.minThreshold > 0 && stock.quantity <= stock.minThreshold;
                    return (
                      <tr key={stock.id} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 pr-3 text-ink-muted">
                          {labelOf(STOCK_ITEM_TYPES, stock.itemType)}
                          {stock.productType ? ` · ${labelOf(PRODUCT_TYPES, stock.productType)}` : ''}
                        </td>
                        <td className="py-2.5 pr-3 font-medium">{stock.label}</td>
                        <td className="py-2.5 pr-3 font-mono-brand text-xs font-semibold">{formatNumber(stock.quantity, stock.unit)}</td>
                        <td className="py-2.5 pr-3 text-ink-muted">{formatNumber(stock.minThreshold, stock.unit)}</td>
                        <td className="py-2.5 pr-3 text-ink-muted">{stock.location ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-xs text-ink-muted">
                          {stock.movements[0] ? (
                            <>
                              {labelOf(STOCK_MOVEMENT_TYPES, stock.movements[0].type)} · {formatDateTime(stock.movements[0].createdAt)}
                              <br />
                              <span className="font-mono-brand">{stock.movements[0].quantity > 0 ? '+' : ''}{formatNumber(stock.movements[0].quantity, stock.unit)}</span>
                            </>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 pr-3"><Badge tone={low ? 'warning' : 'success'}>{low ? 'Sous seuil' : 'OK'}</Badge></td>
                        <td className="py-2.5">
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

      <div className="mt-6">
        <Section title="Derniers mouvements" description="Traçabilité des entrées, sorties, rebuts et ajustements.">
          {movements.length === 0 ? (
            <EmptyState title="Aucun mouvement" description="Les entrées de lots et les consommations de production apparaissent ici automatiquement." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Stock</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Mouvement</th>
                    <th className="pb-2 pr-3">Solde</th>
                    <th className="pb-2 pr-3">Référence</th>
                    <th className="pb-2">Auteur</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3 text-ink-muted">{formatDateTime(movement.createdAt)}</td>
                      <td className="py-2.5 pr-3">{movement.stock.label}</td>
                      <td className="py-2.5 pr-3">{labelOf(STOCK_MOVEMENT_TYPES, movement.type)}</td>
                      <td className={`py-2.5 pr-3 font-mono-brand text-xs font-semibold ${movement.quantity < 0 ? 'text-danger' : 'text-paddy-deep'}`}>
                        {movement.quantity > 0 ? '+' : ''}{formatNumber(movement.quantity, movement.stock.unit)}
                      </td>
                      <td className="py-2.5 pr-3">{formatNumber(movement.resultingQuantity, movement.stock.unit)}</td>
                      <td className="py-2.5 pr-3 text-ink-muted">{movement.reference ?? '—'}</td>
                      <td className="py-2.5 text-ink-muted">{movement.createdBy?.name ?? 'système'}</td>
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
