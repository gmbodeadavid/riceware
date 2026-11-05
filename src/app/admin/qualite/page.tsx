import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getQualityOverview, listBatches, listTests } from '@/lib/production/queries';
import {
  labelOf,
  PRODUCT_TYPES,
  TEST_RESULTS,
  TEST_TYPES,
} from '@/lib/production/types';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import { buttonClassName, inputClassName } from '@/components/admin/fields';
import TestForm from '@/components/admin/TestForm';
import ProductForm from '@/components/admin/ProductForm';
import DeleteButton from '@/components/admin/DeleteButton';

type PageProps = { searchParams: Promise<{ type?: string; result?: string }> };

export default async function QualityPage({ searchParams }: PageProps) {
  const session = await requireAdminPage('quality:view');
  const filters = await searchParams;
  const [overview, tests, batches] = await Promise.all([
    getQualityOverview(),
    listTests({ typeTest: filters.type, result: filters.result }),
    listBatches({ limit: 100 }),
  ]);

  const canWrite = can(session.role, 'quality:write');
  const exportQuery = new URLSearchParams();
  if (filters.type) exportQuery.set('type', filters.type);
  if (filters.result) exportQuery.set('result', filters.result);
  const exportBase = `/api/admin/exports/tests?${exportQuery.toString()}`;

  return (
    <div>
      <PageHeader
        title="Contrôle qualité"
        description="Tests de charge, d’étanchéité et visuels. Chaque échec crée une alerte et rejette le produit concerné."
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Qualité' }]}
        actions={
          <>
            <LinkButton href={`${exportBase}&format=csv`} target="_blank">CSV</LinkButton>
            <LinkButton href={`${exportBase}&format=xls`} target="_blank">Excel</LinkButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Taux de réussite" value={formatPercent(overview.passRate)} hint={`${overview.passed} succès · ${overview.failed} échec(s)`} tone={overview.passRate >= 90 || overview.passed + overview.failed === 0 ? 'paddy' : 'warning'} />
        <StatCard label="Produits enregistrés" value={overview.products.length} hint={`${overview.pendingProducts.length} sans test qualité`} />
        <StatCard label="Tests réalisés" value={overview.passed + overview.failed} hint="Tous types confondus" />
        <StatCard label="Produits rejetés" value={overview.products.filter((product) => product.status === 'rejete').length} tone={overview.products.some((product) => product.status === 'rejete') ? 'danger' : 'default'} hint="Statut mis à jour après un test en échec" />
      </div>

      <form method="get" className="mb-5 mt-5 grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="quality-type">Type de test</label>
          <select id="quality-type" name="type" defaultValue={filters.type ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {TEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="quality-result">Résultat</label>
          <select id="quality-result" name="result" defaultValue={filters.result ?? ''} className={inputClassName}>
            <option value="">Tous</option>
            {TEST_RESULTS.map((result) => <option key={result.value} value={result.value}>{result.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit" className={buttonClassName('primary')}>Filtrer</button>
          <Link href="/admin/qualite" className={buttonClassName('secondary')}>Réinitialiser</Link>
          <span className="ml-auto self-center text-xs text-ink-muted">{tests.length} test(s)</span>
        </div>
      </form>

      {canWrite ? (
        <div className="mb-5 space-y-5">
          <TestForm
            products={overview.products.map((product) => ({
              id: product.id,
              label: `${labelOf(PRODUCT_TYPES, product.type)} — ${formatNumber(product.weightG, 'g')} (${product.batch.code})`,
            }))}
            batches={batches.map((batch) => ({ id: batch.id, code: batch.code }))}
          />
          <ProductForm batches={batches.map((batch) => ({ id: batch.id, code: batch.code }))} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Derniers tests" description="Résultats détaillés et défauts observés.">
          {tests.length === 0 ? (
            <EmptyState title="Aucun test" description="Aucun test ne correspond aux filtres sélectionnés." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Batch / produit</th>
                    <th className="pb-2 pr-3">Mesures</th>
                    <th className="pb-2 pr-3">Résultat</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3 text-ink-muted">{formatDateTime(test.testedAt)}</td>
                      <td className="py-2.5 pr-3">{labelOf(TEST_TYPES, test.typeTest)}</td>
                      <td className="py-2.5 pr-3">
                        {test.produitFini ? (
                          <Link href={`/admin/production/${test.produitFini.batch.id}`} className="text-paddy hover:underline">
                            {test.produitFini.batch.code} · {labelOf(PRODUCT_TYPES, test.produitFini.type)}
                          </Link>
                        ) : test.batch ? (
                          <Link href={`/admin/production/${test.batch.id}`} className="text-paddy hover:underline">{test.batch.code}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-ink-muted">
                        {test.loadKg ? `${test.loadKg} kg` : ''}
                        {test.waterMl ? ` · ${test.waterMl} mL` : ''}
                        {test.thicknessAvgMm ? ` · ${test.thicknessAvgMm} mm` : ''}
                        {[test.cracks ? 'fissures' : '', test.bubbles ? 'bulles' : '', test.deformations ? 'déformations' : ''].filter(Boolean).join(', ')}
                        {!test.loadKg && !test.waterMl && !test.thicknessAvgMm && !test.cracks && !test.bubbles && !test.deformations ? '—' : ''}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={test.result === 'succes' ? 'success' : 'danger'}>{labelOf(TEST_RESULTS, test.result)}</Badge>
                      </td>
                      <td className="py-2.5">
                        {canWrite ? <DeleteButton endpoint={`/api/admin/tests/${test.id}`} confirmation="Supprimer ce test ?" label="Suppr." /> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Produits à contrôler" description="Produits sans aucun test ou dernière mesure.">
          {overview.products.length === 0 ? (
            <EmptyState title="Aucun produit fini" description="Enregistrez un produit depuis un batch de production." />
          ) : (
            <ul className="divide-y divide-line">
              {overview.products.slice(0, 12).map((product) => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{labelOf(PRODUCT_TYPES, product.type)} · {formatNumber(product.weightG, 'g')}</p>
                    <p className="text-xs text-ink-muted">
                      <Link href={`/admin/production/${product.batchId}`} className="text-paddy hover:underline">{product.batch.code}</Link>
                      {' '}· {formatNumber(product.thicknessMm, 'mm')} · {product._count.tests} test(s)
                    </p>
                  </div>
                  <Badge tone={product.status === 'valide' ? (product._count.tests === 0 ? 'warning' : 'success') : 'danger'}>
                    {product.status === 'valide' ? (product._count.tests === 0 ? 'À tester' : 'Validé') : 'Rejeté'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
