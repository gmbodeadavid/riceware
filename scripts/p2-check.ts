/**
 * P2 — Validation des critères d'acceptation
 * Vérifie : traceBackFromOrderLine, traceForwardFromLot, getTraceabilityCoverage
 */
import {
  traceBackFromOrderLine,
  traceForwardFromLot,
  getTraceabilityCoverage,
  getOriginByRizerie,
  getPackLotStock,
} from '../src/lib/traceability';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passed++;
  } else {
    console.error(`  FAIL  ${message}`);
    failed++;
  }
}

async function main() {
  console.log('\n=== P2 Acceptance Tests ===\n');

  // ─── Test 1 : traceBackFromOrderLine (commande P2-1)
  console.log('1) traceBackFromOrderLine(seed-p2-line-1)');
  const trace1 = await traceBackFromOrderLine('seed-p2-line-1');
  assert(trace1.isTracked, 'Ligne 1 est tracée (a des allocations)');
  assert(trace1.allocations.length === 1, `A 1 allocation (got ${trace1.allocations.length})`);
  assert(trace1.riziereShares.length >= 1, `A des rizeries (got ${trace1.riziereShares.length})`);
  // La rizerie de Daloa devrait être présente (batch-multi utilise daloa + man)
  const daloa = trace1.riziereShares.find(r => r.rizerieNom.includes('Daloa'));
  assert(!!daloa, 'Rizerie de Daloa présente dans les parts');

  // ─── Test 2 : traceForwardFromLot (lot daloa → commandes)
  console.log('\n2) traceForwardFromLot(seed-p2-lot-daloa)');
  const forward = await traceForwardFromLot('seed-p2-lot-daloa');
  assert(forward.lot.code === 'RW-2026-10-28-001', `Code lot correct (got ${forward.lot.code})`);
  assert(forward.batches.length >= 1, `A des usages (got ${forward.batches.length})`);
  assert(forward.affectedOrders.length >= 1, `Commandes affectées (got ${forward.affectedOrders.length})`);
  const cmd1 = forward.affectedOrders.find(o => o.orderNumber === 'RW-CMD-P2-001');
  assert(!!cmd1, 'Commande RW-CMD-P2-001 dans les commandes affectées');

  // ─── Test 3 : traceForwardFromLot (lot man → commandes)
  console.log('\n3) traceForwardFromLot(seed-p2-lot-man)');
  const forwardMan = await traceForwardFromLot('seed-p2-lot-man');
  assert(forwardMan.batches.length === 1, `1 batch pour lot Man (got ${forwardMan.batches.length})`);
  assert(forwardMan.affectedOrders.length >= 1, 'Lot Man → commandes tracées');

  // ─── Test 4 : getPackLotStock
  console.log('\n4) getPackLotStock(seed-p2-packlot-assiette100)');
  const stock = await getPackLotStock('seed-p2-packlot-assiette100');
  assert(stock === 15, `Stock restant = 15 (quantity 20 − 5 alloués, got ${stock})`);

  // ─── Test 5 : getTraceabilityCoverage
  console.log('\n5) getTraceabilityCoverage()');
  const coverage = await getTraceabilityCoverage();
  assert(coverage.batches.total > 0, `batches total > 0 (got ${coverage.batches.total})`);
  assert(coverage.batches.withUsage >= 4, `batches avec usage ≥ 4 (got ${coverage.batches.withUsage})`); // 3 anciens + 1 multi
  assert(coverage.lines.total > 0, `lignes livrées total > 0 (got ${coverage.lines.total})`);
  console.log(`     Couverture lignes : ${coverage.lines.fullyCovered}/${coverage.lines.total} (${coverage.lines.pct.toFixed(0)}%)`);
  console.log(`     Couverture batches : ${coverage.batches.withUsage}/${coverage.batches.total} (${coverage.batches.pct.toFixed(0)}%)`);

  // ─── Test 6 : getOriginByRizerie
  console.log('\n6) getOriginByRizerie()');
  const origins = await getOriginByRizerie();
  assert(origins.length >= 2, `Au moins 2 rizeries (got ${origins.length})`);
  const daloaOrig = origins.find(o => o.rizerieNom.includes('Daloa'));
  assert(!!daloaOrig, 'Rizerie de Daloa présente dans les origines');
  assert(daloaOrig?.kgTotal === 150, `Daloa kgTotal = 150 (got ${daloaOrig?.kgTotal})`);

  // ─── Test 7 : multi-lot batch a 2 usages
  console.log('\n7) Batch multi-lots a 2 BatchMaterialUsage');
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  const usages = await p.batchMaterialUsage.findMany({ where: { batchId: 'seed-p2-batch-multi' } });
  await p.$disconnect();
  assert(usages.length === 2, `2 usages pour batch multi-lots (got ${usages.length})`);
  assert(usages.every(u => !u.estimated), 'Aucun usage estimé (données P2 réelles)');

  // ─── Test 8 : batches existants ont tous un BatchMaterialUsage
  console.log('\n8) Anciens batches (avec lotId) ont un BatchMaterialUsage');
  const p2 = new PrismaClient();
  const batchesWithLot = await p2.batchProduction.findMany({ where: { lotId: { not: null }, deletedAt: null } });
  for (const b of batchesWithLot) {
    const usage = await p2.batchMaterialUsage.findFirst({ where: { batchId: b.id } });
    assert(!!usage, `Batch ${b.code} a un BatchMaterialUsage`);
  }
  await p2.$disconnect();

  // ─── Résumé
  console.log(`\n=== Résultat : ${passed} PASS / ${failed} FAIL ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
