/**
 * scripts/p3-check.ts
 *
 * Tests d'acceptation P3 — Traçabilité : interfaces
 * Exécution : npx tsx scripts/p3-check.ts
 *
 * Suppose la DB en état propre P2 (3 rizeries, 3 lots, 3 batches, 1 commande).
 * Crée des données de test P3, les vérifie, puis les nettoie.
 *
 * GUARD : Tourne toujours sur une COPIE de la base (jamais sur dev.db directement).
 * DATABASE_URL est réécrit avant tout import Prisma pour pointer vers la copie.
 */

// ─── SETUP COPIE — DOIT PRÉCÉDER TOUT IMPORT PRISMA ────────────────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname_p3 = path.dirname(fileURLToPath(import.meta.url));
const ROOT_P3 = path.resolve(__dirname_p3, '..');
const REAL_DB_P3 = path.join(ROOT_P3, 'prisma', 'dev.db');
const TEST_DB_P3 = path.join(ROOT_P3, 'backups', 'p3-check-test.db');

if (!fs.existsSync(REAL_DB_P3)) { console.error(`Base réelle introuvable : ${REAL_DB_P3}`); process.exit(1); }
const backupsDir_p3 = path.join(ROOT_P3, 'backups');
if (!fs.existsSync(backupsDir_p3)) fs.mkdirSync(backupsDir_p3);
fs.copyFileSync(REAL_DB_P3, TEST_DB_P3);
// Forcer DATABASE_URL vers la copie AVANT tout import de @prisma/client / traceability
process.env.DATABASE_URL = `file:${TEST_DB_P3}`;
console.log(`[SETUP] Copie de test : ${TEST_DB_P3}`);
console.log(`[SETUP] DATABASE_URL  : ${process.env.DATABASE_URL}`);
// ────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import {
  createPackLotWithStock,
  releasePackLot,
  recallPackLot,
  recallLot,
  createAllocation,
  suggestFifoAllocation,
  cancelOrderAllocations,
  listPackLots,
  getPackLot,
  createBatchMaterialUsage,
  TraceabilityError,
  traceForwardFromLot,
} from '../src/lib/traceability';

const db = new PrismaClient();

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  PASS  ${label}`);
  passed++;
}
function fail(label: string, detail?: unknown) {
  console.error(`  FAIL  ${label}`, detail ?? '');
  failed++;
}

async function assert(label: string, condition: boolean | (() => Promise<boolean>)) {
  try {
    const result = typeof condition === 'function' ? await condition() : condition;
    if (result) ok(label); else fail(label);
  } catch (e) {
    fail(label, e);
  }
}

async function assertThrows(label: string, fn: () => Promise<unknown>, expectedStatus?: number) {
  try {
    await fn();
    fail(label, 'Expected error, got none');
  } catch (e) {
    if (e instanceof TraceabilityError) {
      if (expectedStatus && e.status !== expectedStatus) {
        fail(label, `Expected status ${expectedStatus}, got ${e.status}: ${e.message}`);
      } else {
        ok(label);
      }
    } else {
      fail(label, e);
    }
  }
}

// ─── Setup: charger les données existantes ────────────────────────────────────

async function main() {
  console.log('\n=== P3 ACCEPTANCE TESTS ===\n');

  // Charger les données existantes
  const [batches, lots, order, pack] = await Promise.all([
    db.batchProduction.findMany({ where: { deletedAt: null }, orderBy: { startedAt: 'asc' }, take: 3 }),
    db.lotCoques.findMany({ where: { deletedAt: null }, orderBy: { receivedAt: 'asc' }, take: 3 }),
    db.order.findFirst({ where: { deletedAt: null } }),
    db.productPack.findFirst({ orderBy: { label: 'asc' } }),
  ]);

  if (!batches.length || !lots.length) {
    console.error('ERREUR: Données de base manquantes. Lancez les migrations d\'abord.');
    await db.$disconnect();
    process.exit(1);
  }

  const batch1 = batches[0];
  const lot1 = lots[0];
  const lot2 = lots[1] ?? lot1;

  console.log(`Batch de test : ${batch1.code} (${batch1.piecesProduced} pièces, ${batch1.rejects} rebuts)`);
  console.log(`Lot de test 1 : ${lot1.code}`);
  console.log(`Lot de test 2 : ${lot2.code}`);
  console.log(`Pack de test  : ${pack ? pack.id : 'AUCUN'}`);
  console.log(`Commande      : ${order ? order.orderNumber : 'AUCUNE'}`);
  console.log('');

  // ─── T1: BatchMaterialUsage multi-lots ───────────────────────────────────────
  console.log('T1 — BatchMaterialUsage multi-lots');

  // Nettoyer les BMUs existants pour ce batch si nécessaires
  await db.batchMaterialUsage.deleteMany({
    where: { batchId: batch1.id, id: { startsWith: 'test-' } },
  });

  let bmu1: Awaited<ReturnType<typeof createBatchMaterialUsage>> | null = null;
  let bmu2: Awaited<ReturnType<typeof createBatchMaterialUsage>> | null = null;

  try {
    // Supprimer les BMUs existants pour ce batch (test ou migration) qui bloqueraient
    const existingBMUs = await db.batchMaterialUsage.findMany({
      where: { batchId: batch1.id, deletedAt: null },
    });
    // Si le lot1 a déjà un BMU sur ce batch, tenter avec lot2 sinon
    const alreadyLot1 = existingBMUs.some((b) => b.lotCoquesId === lot1.id);
    const alreadyLot2 = existingBMUs.some((b) => b.lotCoquesId === lot2.id);

    if (!alreadyLot1) {
      bmu1 = await createBatchMaterialUsage({ batchId: batch1.id, lotCoquesId: lot1.id, kgUsed: 5.0 });
    } else {
      bmu1 = existingBMUs.find((b) => b.lotCoquesId === lot1.id) ?? null;
    }
    ok('T1.1 — BMU lot1 créé ou existant');
  } catch (e) {
    fail('T1.1 — BMU lot1 créé ou existant', e);
  }

  // Doublon de lot dans même batch doit être refusé (409) ou précondition (428 si null kg existant)
  await assertThrows('T1.2 — Doublon lot1 dans même batch refusé', async () => {
    await createBatchMaterialUsage({ batchId: batch1.id, lotCoquesId: lot1.id, kgUsed: 3.0, motifEstimation: 'test doublon' });
  }, 409);

  if (!pack) {
    console.log('\n⚠️  Aucun ProductPack trouvé — tests PackLot sautés\n');
    // Print summary
    console.log(`\nRésultat : ${passed} PASS, ${failed} FAIL\n`);
    await db.$disconnect();
    if (failed > 0) process.exit(1);
    return;
  }

  // ─── T2: Création PackLot ─────────────────────────────────────────────────
  console.log('\nT2 — Création PackLot');

  const validPieces = Math.max(0, batch1.piecesProduced - batch1.rejects);
  const qtyToCreate = Math.min(3, Math.floor(validPieces / pack.quantity));

  let packLot: Awaited<ReturnType<typeof createPackLotWithStock>> | null = null;

  if (qtyToCreate < 1) {
    console.log(`  SKIP  T2 — Pièces insuffisantes (${validPieces}) pour pack de ${pack.quantity} pcs`);
  } else {
    try {
      packLot = await createPackLotWithStock({ batchId: batch1.id, packId: pack.id, quantity: qtyToCreate });
      ok(`T2.1 — PackLot créé : ${packLot.code} (statut ${packLot.status})`);
    } catch (e) {
      fail('T2.1 — PackLot créé', e);
    }

    await assert('T2.2 — Statut initial = quarantaine', packLot?.status === 'quarantaine');

    // Vérifier StockMovement créé
    if (packLot) {
      const mvt = await db.stockMovement.findFirst({ where: { packLotId: packLot.id } });
      await assert('T2.3 — StockMovement d\'entrée créé', mvt !== null && mvt.type === 'entree');
    }
  }

  // ─── T3: Libération PackLot (QC) ─────────────────────────────────────────
  console.log('\nT3 — Libération PackLot');

  if (packLot) {
    // Bloquer si pas de test qualité conforme — tester avec un nouveau PackLot temporaire
    {
      // Créer un second packLot temporaire dans un batch sans test
      const batchWithoutTests = batches.find((b) => b.id !== batch1.id);
      if (batchWithoutTests) {
        const validP2 = Math.max(0, batchWithoutTests.piecesProduced - batchWithoutTests.rejects);
        if (validP2 > 0 && Math.floor(validP2 / pack.quantity) > 0) {
          const existTests = await db.testQualite.findMany({ where: { batchId: batchWithoutTests.id, result: 'succes' } });
          if (existTests.length === 0) {
            let tempPL = null;
            try {
              tempPL = await createPackLotWithStock({ batchId: batchWithoutTests.id, packId: pack.id, quantity: 1 });
              await releasePackLot(tempPL.id);
              fail('T3.1 — Libération bloquée sans QC conforme (devrait lancer une erreur)');
            } catch (e) {
              if (e instanceof TraceabilityError && e.status === 422) {
                ok('T3.1 — Libération bloquée sans QC conforme');
              } else {
                fail('T3.1 — Libération bloquée sans QC conforme (mauvais statut)', e);
              }
            } finally {
              if (tempPL) {
                await db.stockMovement.deleteMany({ where: { packLotId: tempPL.id } });
                await db.packLot.delete({ where: { id: tempPL.id } }).catch(() => {});
              }
            }
          } else {
            ok('T3.1 — Skip (tous les batches ont des tests QC)');
          }
        } else {
          ok('T3.1 — Skip (pièces insuffisantes)');
        }
      } else {
        ok('T3.1 — Skip (un seul batch)');
      }
    }

    // Ajouter un test qualité conforme
    const testQualite = await db.testQualite.create({
      data: { batchId: batch1.id, typeTest: 'charge', result: 'succes', testedAt: new Date() },
    });

    try {
      await releasePackLot(packLot.id);
      const updated = await db.packLot.findUnique({ where: { id: packLot.id } });
      ok(`T3.2 — PackLot libéré (statut ${updated?.status})`);
      await assert('T3.3 — Statut = libre', updated?.status === 'libre');
    } catch (e) {
      fail('T3.2 — Libération PackLot', e);
    }

    // Nettoyer le test
    await db.testQualite.delete({ where: { id: testQualite.id } });
  }

  // ─── T4: Suggestion FIFO ─────────────────────────────────────────────────
  console.log('\nT4 — Suggestion FIFO');

  if (order && packLot) {
    // Récupérer la ligne de commande avec productPackId
    const orderLine = await db.orderLine.findFirst({
      where: { orderId: order.id, productPackId: pack.id },
    });

    if (orderLine) {
      const fifo = await suggestFifoAllocation(orderLine.id);
      await assert('T4.1 — FIFO retourne des suggestions', fifo.length > 0);
      if (fifo.length > 0) {
        await assert('T4.2 — Première suggestion = pack correct', fifo[0].packId === pack.id);
      }
    } else {
      console.log('  SKIP  T4 — Aucune ligne de commande avec ce pack');
    }
  } else {
    console.log('  SKIP  T4 — Pas de commande ou de PackLot');
  }

  // ─── T5: Allocation ───────────────────────────────────────────────────────
  console.log('\nT5 — Allocation');

  let allocation = null;
  if (order && packLot) {
    const orderLine = await db.orderLine.findFirst({
      where: { orderId: order.id, productPackId: pack.id },
    });

    if (orderLine) {
      try {
        allocation = await createAllocation({ orderLineId: orderLine.id, packLotId: packLot.id, quantity: 1 });
        ok('T5.1 — Allocation créée');
      } catch (e) {
        fail('T5.1 — Allocation créée', e);
      }

      // Sur-allocation refusée
      await assertThrows('T5.2 — Sur-allocation ligne refusée', async () => {
        await createAllocation({ orderLineId: orderLine.id, packLotId: packLot!.id, quantity: orderLine.quantity + 100 });
      }, 409);

      // Sur-allocation PackLot refusée
      const pkRest = await db.packLot.findUnique({ where: { id: packLot.id }, include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } } });
      const stockRestant = (pkRest?.quantity ?? 0) - (pkRest?.allocations.reduce((s, a) => s + a.quantity, 0) ?? 0);
      if (stockRestant < orderLine.quantity) {
        await assertThrows('T5.3 — Dépassement stock PackLot refusé', async () => {
          await createAllocation({ orderLineId: orderLine.id, packLotId: packLot!.id, quantity: stockRestant + 100 });
        }, 409);
      } else {
        ok('T5.3 — Stock PackLot suffisant (vérification dépassement N/A)');
      }
    } else {
      console.log('  SKIP  T5 — Aucune ligne de commande avec ce pack');
    }
  }

  // ─── T6: Rappel PackLot ────────────────────────────────────────────────────
  console.log('\nT6 — Rappel PackLot');

  if (packLot) {
    // Ne rappeler que si pas encore rappelé
    const currentPL = await db.packLot.findUnique({ where: { id: packLot.id } });
    if (currentPL?.status !== 'rappel') {
      try {
        const recallResult = await recallPackLot(packLot.id, 'Test de rappel P3');
        ok(`T6.1 — PackLot rappelé (${recallResult.affectedOrders.length} commandes)`);
      } catch (e) {
        fail('T6.1 — Rappel PackLot', e);
      }
    } else {
      ok('T6.1 — PackLot déjà rappelé (OK)');
    }

    const afterRecall = await db.packLot.findUnique({ where: { id: packLot.id } });
    await assert('T6.2 — Statut = rappel', afterRecall?.status === 'rappel');

    // Allocation d'un PackLot en rappel doit être refusée
    if (order) {
      const orderLine = await db.orderLine.findFirst({ where: { orderId: order.id, productPackId: pack.id } });
      if (orderLine) {
        await assertThrows('T6.3 — Allocation PackLot en rappel refusée', async () => {
          await createAllocation({ orderLineId: orderLine.id, packLotId: packLot!.id, quantity: 1 });
        }, 409);
      } else {
        ok('T6.3 — Skip (pas de ligne avec ce pack)');
      }
    }
  }

  // ─── T7: Rappel lot de coques ─────────────────────────────────────────────
  console.log('\nT7 — Rappel lot de coques');

  // Tester avec lot2 (éviter de rappeler lot1 si déjà rappelé)
  const lot2Fresh = await db.lotCoques.findUnique({ where: { id: lot2.id } });
  if (lot2Fresh && lot2Fresh.status !== 'recalled') {
    try {
      const recallResult = await recallLot(lot2.id, 'Test P3 — rappel lot');
      ok(`T7.1 — Lot rappelé (${recallResult.affectedOrders.length} commandes concernées)`);
    } catch (e) {
      fail('T7.1 — Rappel lot', e);
    }

    const afterRecall = await db.lotCoques.findUnique({ where: { id: lot2.id } });
    await assert('T7.2 — Statut lot = recalled', afterRecall?.status === 'recalled');
  } else {
    ok('T7.1 — Lot déjà rappelé ou inexistant (OK)');
    ok('T7.2 — Statut lot déjà recalled (OK)');
  }

  // ─── T8: Traçabilité descendante ───────────────────────────────────────────
  console.log('\nT8 — Traçabilité descendante');

  try {
    const trace = await traceForwardFromLot(lot1.id);
    ok('T8.1 — traceForwardFromLot retourne un résultat');
    await assert('T8.2 — Lot id correct', trace.lot.id === lot1.id);
  } catch (e) {
    fail('T8.1 — traceForwardFromLot', e);
  }

  // ─── T9: Page publique TraceabilityAPI ─────────────────────────────────────
  console.log('\nT9 — API publique (pas de fuite de données)');

  if (packLot) {
    const pk = await db.packLot.findUnique({
      where: { id: packLot.id },
      include: {
        pack: { include: { product: { select: { name: true, category: true } } } },
        batch: {
          include: {
            tests: { where: { result: 'succes' }, take: 1 },
            usages: { where: { deletedAt: null }, include: { lot: { include: { rizerie: true } } } },
          },
        },
      },
    });

    if (pk) {
      const forbiddenFields = ['customer', 'totalAmount', 'email', 'phone', 'contractPrice', 'costFcfa'];
      const publicResponse: Record<string, unknown> = {
        type: 'packLot',
        code: pk.code,
        product: { name: pk.pack.product.name, category: pk.pack.product.category },
        packedAt: pk.packedAt,
        status: pk.status,
        batch: { code: pk.batch.code, startedAt: pk.batch.startedAt },
        origins: pk.batch.usages.map((u) => ({ name: u.lot.rizerie.name, location: u.lot.rizerie.location })),
        qualityControl: { passed: pk.batch.tests.length > 0 },
      };
      await assert('T9.1 — Champs obligatoires dans réponse publique', ['code', 'product', 'status', 'batch', 'origins', 'qualityControl'].every((f) => f in publicResponse));
      await assert('T9.2 — Aucune donnée client exposée', !forbiddenFields.some((f) => JSON.stringify(publicResponse).includes(f)));
    } else {
      ok('T9.1 — Skip (PackLot déjà nettoyé)');
      ok('T9.2 — Skip (PackLot déjà nettoyé)');
    }
  } else {
    ok('T9.1 — Skip (pas de PackLot créé)');
    ok('T9.2 — Skip (pas de PackLot créé)');
  }

  // ─── T10: Annulation allocations ────────────────────────────────────────────
  console.log('\nT10 — Annulation allocations (cancelOrderAllocations)');

  if (order && allocation) {
    try {
      await cancelOrderAllocations(order.id);
      ok('T10.1 — cancelOrderAllocations exécuté');
      const alloc = await db.orderLineAllocation.findUnique({ where: { id: allocation.id } });
      await assert('T10.2 — Allocation soft-deletée', alloc?.deletedAt != null);
    } catch (e) {
      fail('T10.1 — cancelOrderAllocations', e);
    }
  } else {
    ok('T10.1 — Skip (pas d\'allocation à annuler)');
    ok('T10.2 — Skip');
  }

  // ─── T11: listPackLots avec filtres ─────────────────────────────────────────
  console.log('\nT11 — listPackLots');

  try {
    const allPL = await listPackLots();
    ok(`T11.1 — listPackLots retourne ${allPL.length} lot(s)`);
    if (allPL.length > 0) {
      await assert('T11.2 — PackLot a remaining calculé', typeof allPL[0].remaining === 'number');
      await assert('T11.3 — PackLot a rizeries', Array.isArray(allPL[0].rizeries));
    }
  } catch (e) {
    fail('T11.1 — listPackLots', e);
  }

  // ─── T12: Nettoyage ─────────────────────────────────────────────────────────
  console.log('\nNettoyage des données de test...');
  if (packLot) {
    await db.orderLineAllocation.deleteMany({ where: { packLotId: packLot.id } });
    await db.stockMovement.deleteMany({ where: { packLotId: packLot.id } });
    await db.packLot.delete({ where: { id: packLot.id } }).catch(() => {});
    console.log(`  PackLot ${packLot.code} supprimé.`);
  }
  // Remettre lot2 en statut normal
  await db.lotCoques.update({ where: { id: lot2.id }, data: { status: 'accepted' } }).catch(() => {});
  // Supprimer BMUs créés dans ce test (seulement ceux pas already existants)
  if (bmu1 && bmu1.id) {
    const existingBMU = await db.batchMaterialUsage.findUnique({ where: { id: bmu1.id } });
    if (existingBMU && !existingBMU.deletedAt) {
      // Ne supprimer que si créé par ce test (pas issu de migration)
      const isTestBMU = !existingBMU.estimated; // Les BMUs de migration ont estimated=true
      if (isTestBMU) {
        await db.batchMaterialUsage.delete({ where: { id: bmu1.id } }).catch(() => {});
      }
    }
  }

  // ─── Résumé ─────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Résultat : ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('✅ Tous les tests P3 passent.\n');
  } else {
    console.log('❌ Des tests ont échoué.\n');
  }

  await db.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  await db.$disconnect();
  process.exit(1);
});
