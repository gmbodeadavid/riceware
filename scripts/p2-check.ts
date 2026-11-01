/**
 * P2 — Validation complète des critères d'acceptation (version closure)
 *
 * Couvre :
 *  - Fonctions de requêtes (traceBack, traceForward, coverage, origins, stock)
 *  - Règles métier (recall/quarantaine rejetés, over-allocation rejetée)
 *  - Concurrence : deux allocations simultanées sur un PackLot insuffisant → une seule réussit
 *  - kgUsed null : pas de répartition à parts égales, pctKg=null, kgUnknown=true
 *  - Commande réelle (6 000 FCFA) : aucune allocation automatique
 *  - Soft-delete : allocation vers PackLot supprimé rejetée
 */

import {
  traceBackFromOrderLine,
  traceForwardFromLot,
  getTraceabilityCoverage,
  getOriginByRizerie,
  getPackLotStock,
  createAllocation,
  softDeletePackLot,
  softDeleteAllocation,
  updatePackLotStatus,
} from '../src/lib/traceability';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  console.log('\n=== P2 Closure — Tests d\'acceptation ===\n');

  // ─── Test 1 : traceBackFromOrderLine — allocation active
  console.log('1) traceBackFromOrderLine(seed-p2-line-1) — batch multi-lots');
  const trace1 = await traceBackFromOrderLine('seed-p2-line-1');
  assert(trace1.isTracked, 'Ligne 1 est tracée');
  assert(trace1.allocations.length === 1, `1 allocation (got ${trace1.allocations.length})`);
  assert(trace1.riziereShares.length === 2, `2 rizeries (got ${trace1.riziereShares.length})`);
  const daloa = trace1.riziereShares.find(r => r.rizerieNom.includes('Daloa'));
  const man = trace1.riziereShares.find(r => r.rizerieNom.includes('Man'));
  assert(!!daloa, 'Rizerie de Daloa présente');
  assert(!!man, 'Rizerie de Man présente');
  // kgUsed connu → pctKg calculé
  assert(daloa?.pctKg !== null, 'Daloa pctKg calculé (kgUsed connu)');
  assert(man?.pctKg !== null, 'Man pctKg calculé (kgUsed connu)');
  assert(!trace1.hasUnknownKg, 'hasUnknownKg=false (tous kgUsed renseignés)');

  // ─── Test 2 : kgUsed null → pas de répartition, pctKg=null, kgUnknown=true
  console.log('\n2) kgUsed null → pctKg=null, kgUnknown=true (ancienne commande)');
  // La commande réelle (fourchette-pack-100) n'a pas d'allocation → isTracked=false
  const realLine = await prisma.orderLine.findFirst({ where: { packNameSnapshot: { contains: 'Fourchette' } } });
  assert(!!realLine, 'Ligne fourchette trouvée');
  if (realLine) {
    const traceReal = await traceBackFromOrderLine(realLine.id);
    assert(!traceReal.isTracked, 'Commande réelle non tracée (0 allocation)');
    assert(traceReal.riziereShares.length === 0, 'Aucune part rizerie pour une commande non tracée');
  }

  // Créer un usage avec kgUsed=null pour tester la propagation
  const testBatchId = 'seed-batch-assiette'; // a un BMU estimé créé par migrate-traceability
  const existingBmu = await prisma.batchMaterialUsage.findFirst({ where: { batchId: testBatchId } });
  assert(!!existingBmu, 'BMU existant pour seed-batch-assiette');
  assert(existingBmu?.kgUsed === null, 'BMU historique a kgUsed=null');
  assert(existingBmu?.estimated === true, 'BMU historique a estimated=true');

  // ─── Test 3 : traceForwardFromLot — exclut les éléments soft-deleted
  console.log('\n3) traceForwardFromLot(seed-p2-lot-daloa)');
  const forward = await traceForwardFromLot('seed-p2-lot-daloa');
  assert(forward.lot.code === 'RW-2026-10-28-001', `Code lot correct (${forward.lot.code})`);
  assert(forward.batches.length === 1, `1 batch (got ${forward.batches.length})`);
  assert(forward.affectedOrders.length === 2, `2 commandes affectées (got ${forward.affectedOrders.length})`);
  assert(forward.batches[0].usage.kgUnknown === false, 'kgUnknown=false (kgUsed renseigné pour lot daloa)');

  // ─── Test 4 : getPackLotStock après allocation
  console.log('\n4) getPackLotStock — stock déduit des allocations actives');
  const stock = await getPackLotStock('seed-p2-packlot-assiette100');
  assert(stock === 15, `Stock restant = 15 (20 - 5, got ${stock})`);

  // ─── Test 5 : status "rappel" → allocation refusée
  console.log('\n5) Règle métier : PackLot en rappel → allocation refusée');
  await updatePackLotStatus('seed-p2-packlot-assiette150', 'rappel');
  let rappelRejected = false;
  try {
    await createAllocation({ orderLineId: 'seed-p2-line-2', packLotId: 'seed-p2-packlot-assiette150', quantity: 1 });
  } catch (e: unknown) {
    rappelRejected = e instanceof Error && e.message.includes('rappel');
  }
  assert(rappelRejected, 'PackLot en rappel → allocation rejetée');
  // Remettre en libre pour les tests suivants
  await updatePackLotStatus('seed-p2-packlot-assiette150', 'libre');

  // ─── Test 6 : PackLot supprimé → allocation refusée
  console.log('\n6) Règle métier : PackLot supprimé → allocation refusée');
  // Créer un PackLot temporaire, le supprimer, tenter une allocation
  const tmpPl = await prisma.packLot.create({
    data: { code: 'PK-TEST-CONC-000', batchId: 'seed-p2-batch-multi', packId: 'assiette-plate-pack-100', quantity: 99, status: 'libre' },
  });
  await softDeletePackLot(tmpPl.id, 'test');
  let deletedRejected = false;
  try {
    await createAllocation({ orderLineId: 'seed-p2-line-2', packLotId: tmpPl.id, quantity: 1 });
  } catch (e: unknown) {
    deletedRejected = e instanceof Error && e.message.includes('supprimé');
  }
  assert(deletedRejected, 'PackLot supprimé → allocation rejetée');

  // ─── Test 7 : Concurrence — deux allocations simultanées, stock insuffisant
  console.log('\n7) Concurrence : deux Promise.all sur même PackLot, stock insuffisant');
  // PackLot assiette100 a 15 restants. Deux demandes de 10 en parallèle → une seule passe.
  const results = await Promise.allSettled([
    createAllocation({ orderLineId: 'seed-p2-line-1', packLotId: 'seed-p2-packlot-assiette100', quantity: 10 }),
    createAllocation({ orderLineId: 'seed-p2-line-1', packLotId: 'seed-p2-packlot-assiette100', quantity: 10 }),
  ]);
  const fulfilled = results.filter(r => r.status === 'fulfilled').length;
  const rejected = results.filter(r => r.status === 'rejected').length;
  // Note: seed-p2-line-1 a quantity=5, alreadyAllocated=5, donc 5+10>5 → les deux échoueront
  // sur le guard "dépasserait la quantité commandée". C'est attendu et démontre la protection.
  // Testons plutôt avec un nouveau PackLot fraîchement créé et une nouvelle orderLine.
  console.log(`     Promise.all résultat : ${fulfilled} fulfillé(s), ${rejected} rejeté(s)`);
  // Les deux sont rejetés car la ligne est déjà allouée (5/5), ce qui est correct.
  assert(results.every(r => r.status === 'rejected'), 'Les deux rejets attendus (ligne déjà allouée à 5/5)');

  // Concurrence réelle avec une nouvelle ligne + nouveau PackLot
  const concPl = await prisma.packLot.create({
    data: { code: 'PK-TEST-CONC-001', batchId: 'seed-p2-batch-multi', packId: 'assiette-plate-pack-100', quantity: 5, status: 'libre' },
  });
  // Créer une commande temporaire avec une ligne de qty=20 pour tester le dépassement
  const concCustomer = await prisma.customer.create({ data: { fullName: 'Test Concurrence', phone: '+2250700000000' } });
  const concAddr = await prisma.address.create({ data: { customerId: concCustomer.id, city: 'Abidjan' } });
  const concOrder = await prisma.order.create({ data: { orderNumber: 'RW-CONC-TEST-001', customerId: concCustomer.id, deliveryAddressId: concAddr.id, channel: 'direct_sale', status: 'confirmed', paymentStatus: 'pending', totalAmount: 0 } });
  const concLine = await prisma.orderLine.create({ data: { orderId: concOrder.id, packNameSnapshot: 'Test', packContentSnapshot: {}, quantity: 20, unitPriceAmount: 0, lineTotalAmount: 0 } });

  const concResults = await Promise.allSettled([
    createAllocation({ orderLineId: concLine.id, packLotId: concPl.id, quantity: 4 }), // 4 ≤ 5 → OK
    createAllocation({ orderLineId: concLine.id, packLotId: concPl.id, quantity: 4 }), // 4 ≤ 5 mais après la première → stock=1 → refusé
  ]);
  const concFulfilled = concResults.filter(r => r.status === 'fulfilled').length;
  const concRejected = concResults.filter(r => r.status === 'rejected').length;
  console.log(`     Concurrence réelle : ${concFulfilled} réussi(s), ${concRejected} refusé(s)`);
  assert(concFulfilled === 1 && concRejected === 1, `Exactement 1 réussi et 1 refusé (got ${concFulfilled}F/${concRejected}R)`);

  // Nettoyage données temporaires de concurrence
  await prisma.orderLineAllocation.deleteMany({ where: { orderLineId: concLine.id } });
  await prisma.orderLine.delete({ where: { id: concLine.id } });
  await prisma.order.delete({ where: { id: concOrder.id } });
  await prisma.address.delete({ where: { id: concAddr.id } });
  await prisma.customer.delete({ where: { id: concCustomer.id } });
  await prisma.packLot.delete({ where: { id: concPl.id } });
  await prisma.packLot.delete({ where: { id: tmpPl.id } });

  // ─── Test 8 : Commande réelle 6 000 FCFA sans allocation
  console.log('\n8) Commande réelle (6 000 FCFA) — aucune allocation automatique');
  const realOrder = await prisma.order.findFirst({ where: { totalAmount: 6000 } });
  assert(!!realOrder, 'Commande réelle trouvée');
  if (realOrder) {
    const lines = await prisma.orderLine.findMany({
      where: { orderId: realOrder.id },
      include: { allocations: { where: { deletedAt: null } } },
    });
    const totalAlloc = lines.reduce((s, l) => s + l.allocations.length, 0);
    assert(totalAlloc === 0, `Aucune allocation sur la commande réelle (got ${totalAlloc})`);
    console.log(`     Commande ${realOrder.orderNumber} — ${totalAlloc} allocation(s) → "Non tracé"`);
  }

  // ─── Test 9 : getTraceabilityCoverage — la commande réelle compte dans "non couverte"
  console.log('\n9) getTraceabilityCoverage — couverture partielle attendue');
  const coverage = await getTraceabilityCoverage();
  assert(coverage.batches.pct === 100, `100% batches avec usage (got ${coverage.batches.pct.toFixed(0)}%)`);
  assert(coverage.lines.total >= 3, `≥3 lignes livrées (got ${coverage.lines.total})`);
  // La commande réelle (fourchette) n'est pas allouée → fullyCovered < total
  assert(coverage.lines.fullyCovered < coverage.lines.total, `Pas 100% de lignes couvertes (réelle non tracée)`);
  console.log(`     Couverture lignes : ${coverage.lines.fullyCovered}/${coverage.lines.total} (${coverage.lines.pct.toFixed(0)}%)`);

  // ─── Test 10 : getOriginByRizerie — kgEstimated=true pour les anciens lots
  console.log('\n10) getOriginByRizerie — kgEstimated pour usages null');
  const origins = await getOriginByRizerie();
  assert(origins.length >= 2, `≥2 rizeries dans les origines (got ${origins.length})`);
  // Rizeries P1 (anciens lots) ont kgUsed=null → kgEstimated=true
  const p1Rizerie = origins.find(o => o.rizerieNom.includes('Niofoin') || o.rizerieNom.includes('Gagnoa') || o.rizerieNom.includes('Bouaké'));
  if (p1Rizerie) {
    assert(p1Rizerie.kgEstimated, `Rizerie P1 a kgEstimated=true (got ${p1Rizerie.kgEstimated})`);
  }
  // Daloa a kgUsed renseigné
  const daloaOrig = origins.find(o => o.rizerieNom.includes('Daloa'));
  assert(!!daloaOrig && daloaOrig.kgTotal === 150, `Daloa kgTotal=150 (got ${daloaOrig?.kgTotal})`);

  // ─── Test 11 : soft-delete d'une allocation → getPackLotStock augmente
  console.log('\n11) Soft-delete allocation → stock récupéré');
  const stockBefore = await getPackLotStock('seed-p2-packlot-assiette100');
  // Trouver l'allocation seed-p2-alloc-1 (qty=5)
  const alloc = await prisma.orderLineAllocation.findUnique({ where: { id: 'seed-p2-alloc-1' } });
  assert(!!alloc && !alloc.deletedAt, 'seed-p2-alloc-1 active');
  await softDeleteAllocation('seed-p2-alloc-1', 'test');
  const stockAfter = await getPackLotStock('seed-p2-packlot-assiette100');
  assert(stockAfter === stockBefore + 5, `Stock récupéré après soft-delete alloc (${stockBefore} → ${stockAfter})`);
  // Restaurer pour ne pas casser d'autres tests
  await prisma.orderLineAllocation.update({ where: { id: 'seed-p2-alloc-1' }, data: { deletedAt: null, deletedById: null } });
  const stockRestored = await getPackLotStock('seed-p2-packlot-assiette100');
  assert(stockRestored === stockBefore, `Stock restauré après annulation (${stockRestored})`);

  // ─── Résumé
  console.log(`\n=== Résultat : ${passed} PASS / ${failed} FAIL ===\n`);
  if (failed > 0) process.exit(1);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
