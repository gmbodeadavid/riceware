/**
 * scripts/seed-demo.ts
 *
 * Insère les données de démonstration P2 dans UNE BASE DÉDIÉE (prisma/demo.db).
 *
 * Garanties :
 *  - Refuse si DATABASE_URL pointe sur dev.db (base réelle)
 *  - Refuse si ALLOW_SEED_ON_REAL_DB n'est pas '1' et que la base contient des
 *    commandes payées non-DEMO
 *  - Tous les codes métier sont préfixés DEMO- (codes lots, batches, PackLots)
 *
 * Usage : npm run db:seed:demo
 *   (ou DATABASE_URL=file:./prisma/demo.db npx tsx scripts/seed-demo.ts)
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/demo.db';
const workspaceRoot = path.resolve(__dirname, '..');

// ─── Garde-fou : refuser si DATABASE_URL pointe sur la base réelle ────────────
const realDbPath = path.resolve(workspaceRoot, 'prisma', 'dev.db').replace(/\\/g, '/');
const urlPath = dbUrl.replace('file:', '').replace(/\\/g, '/');
const resolvedUrlPath = path.resolve(workspaceRoot, urlPath.replace(/^\.\//, '')).replace(/\\/g, '/');

if (resolvedUrlPath === realDbPath && process.env.ALLOW_SEED_ON_REAL_DB !== '1') {
  console.error(
    '\n❌ SEED DEMO REFUSÉ : DATABASE_URL pointe sur la base réelle (dev.db).\n' +
    '   Ce script ne doit fonctionner que sur une base de démonstration dédiée.\n' +
    '   Usage : npm run db:seed:demo (utilise prisma/demo.db)\n' +
    '   Pour forcer (à ne faire qu\'en dev) : ALLOW_SEED_ON_REAL_DB=1 DATABASE_URL=file:./prisma/dev.db npx tsx scripts/seed-demo.ts\n',
  );
  process.exit(1);
}

// Si demo.db n'existe pas, l'initialiser avec les migrations
if (!fs.existsSync(path.resolve(workspaceRoot, 'prisma', 'demo.db')) && dbUrl === 'file:./prisma/demo.db') {
  console.log('Initialisation de prisma/demo.db...');
  const { execSync } = await import('child_process');
  execSync('npx prisma migrate deploy', {
    cwd: workspaceRoot,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
  });
}

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 9): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  // Vérification que la base n'est pas la base réelle (par son contenu)
  const realOrders = await prisma.order.count({
    where: { paymentStatus: 'paid', orderNumber: { not: { startsWith: 'DEMO-' } } },
  });
  if (realOrders > 0 && process.env.ALLOW_SEED_ON_REAL_DB !== '1') {
    console.error(
      `\n❌ SEED DEMO REFUSÉ : ${realOrders} commande(s) réelle(s) (non DEMO-) détectée(s).\n`,
    );
    process.exit(1);
  }

  console.log('\n=== Seed démo P2 ===\n');

  // ─── 2 rizeries ────────────────────────────────────────────────────────────
  await prisma.rizerie.upsert({
    where: { id: 'demo-rizerie-daloa' },
    update: {},
    create: { id: 'demo-rizerie-daloa', name: 'Rizerie de Daloa (DEMO)', location: 'Daloa', contractType: 'achat', active: true },
  });
  await prisma.rizerie.upsert({
    where: { id: 'demo-rizerie-man' },
    update: {},
    create: { id: 'demo-rizerie-man', name: 'Rizerie de Man (DEMO)', location: 'Man', contractType: 'achat', active: true },
  });

  // ─── 3 lots ─────────────────────────────────────────────────────────────────
  for (const [id, code, rizerieId, netKg] of [
    ['demo-lot-daloa-1', 'DEMO-RW-2026-10-28-001', 'demo-rizerie-daloa', 600],
    ['demo-lot-man-1', 'DEMO-RW-2026-10-29-001', 'demo-rizerie-man', 400],
    ['demo-lot-daloa-2', 'DEMO-RW-2026-10-30-001', 'demo-rizerie-daloa', 500],
  ] as const) {
    await prisma.lotCoques.upsert({
      where: { id },
      update: {},
      create: {
        id, code, rizerieId,
        receivedAt: daysAgo(10),
        grossWeightKg: Number(netKg) + 50,
        tareWeightKg: 50,
        netWeightKg: Number(netKg),
        humidityPct: 0.11,
        status: 'accepted',
      },
    });
  }

  // ─── 1 batch multi-lots ────────────────────────────────────────────────────
  await prisma.batchProduction.upsert({
    where: { id: 'demo-batch-multi' },
    update: {},
    create: {
      id: 'demo-batch-multi',
      code: 'DEMO-RW-BAT-2026-10-30-001',
      lotId: 'demo-lot-daloa-1',  // @deprecated — source de vérité = BMU
      startedAt: daysAgo(5),
      productType: 'assiette',
      powderKg: 250, binderKg: 10, mixHumidityPct: 0.08,
      pressingTempC: 185, pressureMpa: 18, cycleTimeMin: 6,
      piecesProduced: 2400, rejects: 60,
      powderCostFcfa: 12500, binderCostFcfa: 15000,
      laborCostFcfa: 5000, energyCostFcfa: 2500,
    },
  });

  await prisma.batchMaterialUsage.upsert({
    where: { batchId_lotCoquesId: { batchId: 'demo-batch-multi', lotCoquesId: 'demo-lot-daloa-1' } },
    update: {},
    create: { id: 'demo-usage-daloa', batchId: 'demo-batch-multi', lotCoquesId: 'demo-lot-daloa-1', kgUsed: 150, estimated: false },
  });
  await prisma.batchMaterialUsage.upsert({
    where: { batchId_lotCoquesId: { batchId: 'demo-batch-multi', lotCoquesId: 'demo-lot-man-1' } },
    update: {},
    create: { id: 'demo-usage-man', batchId: 'demo-batch-multi', lotCoquesId: 'demo-lot-man-1', kgUsed: 100, estimated: false },
  });

  // ─── 2 PackLot ─────────────────────────────────────────────────────────────
  await prisma.packLot.upsert({
    where: { id: 'demo-packlot-100' },
    update: {},
    create: { id: 'demo-packlot-100', code: 'DEMO-PK-20261030-001', batchId: 'demo-batch-multi', packId: 'assiette-plate-pack-100', quantity: 20, status: 'libre', packedAt: daysAgo(4) },
  });
  await prisma.packLot.upsert({
    where: { id: 'demo-packlot-150' },
    update: {},
    create: { id: 'demo-packlot-150', code: 'DEMO-PK-20261030-002', batchId: 'demo-batch-multi', packId: 'assiette-plate-pack-150', quantity: 10, status: 'libre', packedAt: daysAgo(4) },
  });

  // ─── 2 commandes allouées ──────────────────────────────────────────────────
  await prisma.customer.upsert({
    where: { id: 'demo-customer-1' },
    update: {},
    create: { id: 'demo-customer-1', fullName: 'Restaurant Démo (DEMO)', phone: '+2250000000001' },
  });
  await prisma.customer.upsert({
    where: { id: 'demo-customer-2' },
    update: {},
    create: { id: 'demo-customer-2', fullName: 'Traiteur Démo (DEMO)', phone: '+2250000000002' },
  });
  await prisma.address.upsert({
    where: { id: 'demo-addr-1' },
    update: {},
    create: { id: 'demo-addr-1', customerId: 'demo-customer-1', city: 'Abidjan' },
  });
  await prisma.address.upsert({
    where: { id: 'demo-addr-2' },
    update: {},
    create: { id: 'demo-addr-2', customerId: 'demo-customer-2', city: 'Bouaké' },
  });

  for (const [ordId, num, custId, addrId, lineId, packId, snap, allocId, plId, qty, total] of [
    ['demo-order-1', 'DEMO-CMD-001', 'demo-customer-1', 'demo-addr-1', 'demo-line-1', 'assiette-plate-pack-100', 'Assiette plate — Pack de 100 (DEMO)', 'demo-alloc-1', 'demo-packlot-100', 5, 60000],
    ['demo-order-2', 'DEMO-CMD-002', 'demo-customer-2', 'demo-addr-2', 'demo-line-2', 'assiette-plate-pack-150', 'Assiette plate — Pack de 150 (DEMO)', 'demo-alloc-2', 'demo-packlot-150', 3, 30000],
  ] as const) {
    await prisma.order.upsert({
      where: { id: ordId },
      update: {},
      create: { id: ordId, orderNumber: num, customerId: custId, deliveryAddressId: addrId, channel: 'direct_sale', status: 'delivered', paymentStatus: 'paid', subtotalAmount: Number(total), totalAmount: Number(total), deliveredAt: daysAgo(2) },
    });
    await prisma.orderLine.upsert({
      where: { id: lineId },
      update: {},
      create: { id: lineId, orderId: ordId, productPackId: packId, packNameSnapshot: snap, packContentSnapshot: {}, quantity: Number(qty), unitPriceAmount: Math.round(Number(total) / Number(qty)), lineTotalAmount: Number(total), packQuantity: packId.includes('100') ? 100 : 150 },
    });
    await prisma.orderLineAllocation.upsert({
      where: { orderLineId_packLotId: { orderLineId: lineId, packLotId: plId } },
      update: {},
      create: { id: allocId, orderLineId: lineId, packLotId: plId, quantity: Number(qty) },
    });
  }

  console.log('✓ Données de démonstration P2 insérées (demo.db).');
  console.log('  Rizeries: 2 | Lots: 3 | BatchMultiLots: 1 | PackLots: 2 | Commandes: 2 (toutes DEMO-)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
