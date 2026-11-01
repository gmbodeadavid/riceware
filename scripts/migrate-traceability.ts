/**
 * P2 — Script de reprise de données de traçabilité
 * Idempotent : peut être relancé plusieurs fois sans doublon.
 *
 * Usage : npx tsx scripts/migrate-traceability.ts [--dry-run]
 *
 * Actions :
 *  1. Pour chaque BatchProduction avec lotId non null :
 *     → Crée une ligne BatchMaterialUsage (si elle n'existe pas déjà)
 *     → kgUsed = null (non renseigné pour les données historiques), estimated = true
 *  2. Pour les StockMovement dont reference correspond exactement au code d'un LotCoques :
 *     → Renseigne lotCoquesId si la correspondance est unique
 *     → Sinon, liste le cas dans le rapport CSV
 *  3. Génère scripts/migrate-traceability-report.csv avec les cas non repris
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const isDryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

type ReportRow = {
  movementId: string;
  reference: string;
  reason: string;
};

async function main() {
  console.log(`\n=== P2 Migration Traçabilité${isDryRun ? ' [DRY RUN]' : ''} ===\n`);
  const report: ReportRow[] = [];

  // ─── Étape 1 : BatchMaterialUsage depuis lotId ─────────────────────────────
  console.log('Étape 1 — BatchMaterialUsage depuis BatchProduction.lotId …');

  const batches = await prisma.batchProduction.findMany({
    where: { lotId: { not: null } },
    select: { id: true, code: true, lotId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const batch of batches) {
    if (!batch.lotId) continue;

    const existing = await prisma.batchMaterialUsage.findUnique({
      where: { batchId_lotCoquesId: { batchId: batch.id, lotCoquesId: batch.lotId } },
    });

    if (existing) {
      skipped++;
      console.log(`  SKIP  BatchMaterialUsage déjà présent — batch ${batch.code}`);
      continue;
    }

    // Vérifier que le lot existe
    const lot = await prisma.lotCoques.findUnique({ where: { id: batch.lotId } });
    if (!lot) {
      console.warn(`  WARN  Lot ${batch.lotId} introuvable pour batch ${batch.code} — ignoré`);
      report.push({ movementId: batch.id, reference: batch.code, reason: `Lot ${batch.lotId} introuvable` });
      continue;
    }

    if (!isDryRun) {
      await prisma.batchMaterialUsage.create({
        data: {
          batchId: batch.id,
          lotCoquesId: batch.lotId,
          kgUsed: null,      // non renseigné pour les données historiques
          estimated: true,   // marqué « estimé »
        },
      });
    }
    created++;
    console.log(`  ${isDryRun ? 'DRY' : 'OK  '} BatchMaterialUsage batch=${batch.code} lot=${lot.code}${isDryRun ? ' (non appliqué)' : ''}`);
  }

  console.log(`\n  Résultat étape 1 : ${created} créés, ${skipped} ignorés (déjà présents)\n`);

  // ─── Étape 2 : StockMovement.lotCoquesId depuis reference ──────────────────
  console.log('Étape 2 — Renseigner StockMovement.lotCoquesId depuis reference …');

  // Construire un index code → lotId (ne prendre que les codes uniques)
  const allLots = await prisma.lotCoques.findMany({ select: { id: true, code: true } });
  const lotByCode = new Map(allLots.map((l) => [l.code, l.id]));

  const movements = await prisma.stockMovement.findMany({
    where: { lotCoquesId: null, reference: { not: null } },
    select: { id: true, reference: true },
  });

  let linked = 0;
  let unmatched = 0;

  for (const mvt of movements) {
    if (!mvt.reference) continue;

    const lotId = lotByCode.get(mvt.reference);

    if (!lotId) {
      // Pas un code lot → normal pour les références de batch
      continue;
    }

    if (!isDryRun) {
      await prisma.stockMovement.update({
        where: { id: mvt.id },
        data: { lotCoquesId: lotId },
      });
    }
    linked++;
    console.log(`  ${isDryRun ? 'DRY' : 'OK  '} StockMovement ${mvt.id} → lotCoquesId ${lotId} (ref="${mvt.reference}")`);
  }

  // Mouvements dont reference ressemble à un code lot mais n'a pas de correspondance exacte
  const ambiguous = movements.filter(
    (m) => m.reference && m.reference.startsWith('RW-') && !lotByCode.has(m.reference),
  );
  for (const mvt of ambiguous) {
    unmatched++;
    report.push({ movementId: mvt.id, reference: mvt.reference ?? '', reason: 'Aucun lot correspondant (possible batch ou texte libre)' });
  }

  console.log(`\n  Résultat étape 2 : ${linked} mouvements liés, ${unmatched} cas non repris\n`);

  // ─── Rapport CSV ────────────────────────────────────────────────────────────
  const reportPath = path.join(process.cwd(), 'scripts', 'migrate-traceability-report.csv');
  const csvLines = ['movementId,reference,reason', ...report.map((r) => `${r.movementId},"${r.reference}","${r.reason}"`)];
  if (!isDryRun) {
    fs.writeFileSync(reportPath, csvLines.join('\n'), 'utf8');
    console.log(`Rapport CSV écrit : ${reportPath} (${report.length} cas)`);
  } else {
    console.log(`[DRY RUN] Rapport CSV aurait ${report.length} ligne(s)`);
  }

  console.log('\n=== Migration terminée ===\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
