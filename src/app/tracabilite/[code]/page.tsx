import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import { formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { getLotByCode } from '@/lib/production/queries';
import { computeRejectRate, computeYield, labelOf, LOT_STATUSES, LOT_VISUAL_QUALITIES, PRODUCT_TYPES } from '@/lib/production/types';

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Traçabilité ${decodeURIComponent(code)} — RiceWare CI`,
    description: 'Fiche publique de traçabilité d’un lot de coques de riz RiceWare CI.',
    robots: { index: false, follow: true },
  };
}

export default async function TraceabilityPage({ params }: PageProps) {
  const { code } = await params;
  const lot = await getLotByCode(decodeURIComponent(code));
  if (!lot) notFound();

  const totalPieces = lot.batches.reduce((total, batch) => total + batch.piecesProduced, 0);
  const totalRejects = lot.batches.reduce((total, batch) => total + batch.rejects, 0);

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-[68px] max-w-page items-center gap-3 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-9 w-auto" />
            <span className="font-display text-lg font-bold text-paddy">RiceWare CI</span>
          </Link>
          <span className="ml-auto rounded-full border border-paddy/30 bg-paddy/5 px-3 py-1 text-xs font-semibold text-paddy-deep">
            Traçabilité vérifiée
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="mb-2 font-mono-brand text-xs uppercase tracking-[0.18em] text-ink-muted">Fiche lot</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{lot.code}</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Ce lot de coques de riz a été réceptionné par RiceWare CI le {formatDateTime(lot.receivedAt)}.
          La fiche présente les données de réception et les batches de production qui en sont issus.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Poids net', value: formatNumber(lot.netWeightKg, 'kg') },
            { label: 'Humidité mesurée', value: formatPercent(lot.humidityPct) },
            { label: 'État visuel', value: labelOf(LOT_VISUAL_QUALITIES, lot.visualQuality) },
          ].map((item) => (
            <div key={item.label} className="rounded-panel border border-line bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-muted">{item.label}</p>
              <p className="mt-2 font-display text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Origine et réception</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Rizerie</dt>
              <dd className="font-medium">{lot.rizerie.name}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Localisation</dt>
              <dd className="font-medium">{lot.rizerie.location}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Poids brut / tare</dt>
              <dd className="font-medium">
                {formatNumber(lot.grossWeightKg, 'kg')} / {formatNumber(lot.tareWeightKg, 'kg')}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Statut du lot</dt>
              <dd className="font-medium">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${lot.status === 'accepted' ? 'bg-paddy/10 text-paddy-deep' : 'bg-danger/10 text-danger'}`}>
                  {labelOf(LOT_STATUSES, lot.status)}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-panel border border-line bg-surface p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Transformation</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {lot.batches.length} batch{lot.batches.length > 1 ? 'es' : ''} issu{lot.batches.length > 1 ? 's' : ''} de ce lot.
              </p>
            </div>
            {totalPieces > 0 && (
              <p className="font-mono-brand text-xs text-ink-muted">
                {formatNumber(totalPieces, 'pièces')} · rebut {formatPercent(computeRejectRate(totalPieces, totalRejects))}
              </p>
            )}
          </div>

          {lot.batches.length === 0 ? (
            <p className="mt-4 rounded-control border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
              Aucun batch de production n’est encore rattaché à ce lot.
            </p>
          ) : (
            <ol className="mt-5 space-y-4">
              {lot.batches.map((batch) => (
                <li key={batch.code} className="rounded-control border border-line bg-ground/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono-brand text-sm font-semibold">{batch.code}</p>
                    <span className="text-xs text-ink-muted">{formatDate(batch.startedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {formatNumber(batch.piecesProduced, 'pièces')} produites · rendement{' '}
                    {formatPercent(computeYield(batch.piecesProduced, batch.rejects))} · types :{' '}
                    {[...new Set(batch.products.map((product) => labelOf(PRODUCT_TYPES, product.type)))].join(', ') || 'à préciser'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="mt-8 text-xs leading-5 text-ink-muted">
          Données déclaratives issues du système de gestion RiceWare CI. Cette fiche ne remplace pas un
          certificat de laboratoire indépendant. Pour toute vérification, contactez l’équipe RiceWare CI
          en rappelant l’identifiant du lot.
        </p>

        <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-paddy hover:text-paddy-deep">
          ← Retour au site RiceWare CI
        </Link>
      </main>
    </div>
  );
}
