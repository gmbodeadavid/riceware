import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-guard';
import { can } from '@/lib/rbac';
import { getQualityOverview, listTests } from '@/lib/production/queries';
import {
  labelOf,
  PRODUCT_TYPES,
  TEST_RESULTS,
  TEST_TYPES,
} from '@/lib/production/types';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Badge, EmptyState, LinkButton, Section } from '@/components/admin/ui';
import { buttonClassName } from '@/components/admin/fields';
import DeleteButton from '@/components/admin/DeleteButton';

type PageProps = { searchParams: Promise<{ type?: string; result?: string }> };

export default async function QualityPage({ searchParams }: PageProps) {
  const session = await requireAdminPage('quality:view');
  const filters = await searchParams;
  const [overview, tests] = await Promise.all([
    getQualityOverview(),
    listTests({ typeTest: filters.type, result: filters.result }),
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
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Qualité' }]}
        actions={
          <>
            {canWrite ? (
              <>
                <Link
                  href="/admin/qualite/test"
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-husk px-4 py-2 text-sm font-semibold text-on-husk transition-colors hover:bg-husk-deep"
                >
                  + Saisir un test
                </Link>
                <Link
                  href="/admin/qualite/produit"
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep"
                >
                  + Enregistrer un produit
                </Link>
              </>
            ) : null}
            <LinkButton href={`${exportBase}&format=csv`} target="_blank">CSV</LinkButton>
            <LinkButton href={`${exportBase}&format=xls`} target="_blank">Excel</LinkButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Taux de réussite" value={formatPercent(overview.passRate)} hint={`${overview.passed} succès · ${overview.failed} échec(s)`} tone={overview.passRate >= 90 || overview.passed + overview.failed === 0 ? 'paddy' : 'warning'} />
        <StatCard label="Produits" value={overview.products.length} hint={`${overview.pendingProducts.length} sans test`} />
        <StatCard label="Tests réalisés" value={overview.passed + overview.failed} />
        <StatCard label="Rejetés" value={overview.products.filter((product) => product.status === 'rejete').length} tone={overview.products.some((product) => product.status === 'rejete') ? 'danger' : 'default'} />
      </div>

      <form method="get" className="mb-5 mt-4 flex flex-wrap items-end gap-3 rounded-panel border border-line bg-surface px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="quality-type">Type</label>
          <select id="quality-type" name="type" defaultValue={filters.type ?? ''} className="rounded-control border border-line bg-ground px-3 py-2 text-sm">
            <option value="">Tous</option>
            {TEST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="quality-result">Résultat</label>
          <select id="quality-result" name="result" defaultValue={filters.result ?? ''} className="rounded-control border border-line bg-ground px-3 py-2 text-sm">
            <option value="">Tous</option>
            {TEST_RESULTS.map((result) => <option key={result.value} value={result.value}>{result.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className={buttonClassName('primary')}>Filtrer</button>
          <Link href="/admin/qualite" className={buttonClassName('secondary')}>Réinitialiser</Link>
        </div>
        <span className="ml-auto self-center text-xs text-ink-muted">{tests.length} {tests.length === 1 ? 'test' : 'tests'}</span>
      </form>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Derniers tests">
          {tests.length === 0 ? (
            <EmptyState title="Aucun test" />
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

        <Section title="Produits à contrôler">
          {overview.products.length === 0 ? (
            <EmptyState title="Aucun produit fini" />
          ) : (
            <ul className="divide-y divide-line">
              {overview.products.slice(0, 12).map((product) => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{labelOf(PRODUCT_TYPES, product.type)} · {formatNumber(product.weightG, 'g')}</p>
                    <p className="text-xs text-ink-muted">
                      <Link href={`/admin/production/${product.batchId}`} className="text-paddy hover:underline">{product.batch.code}</Link>
                      {' '}· {formatNumber(product.thicknessMm, 'mm')} · {product._count.tests} {product._count.tests === 1 ? 'test' : 'tests'}
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
