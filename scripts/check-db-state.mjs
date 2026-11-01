import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const r = await db.rizerie.count();
const l = await db.lotCoques.count();
const b = await db.batchProduction.count();
const o = await db.order.count();
const s = await db.stock.count();
const c = await db.customer.count();
const pk = await db.packLot.count();
const ola = await db.orderLineAllocation.count();
const bmu = await db.batchMaterialUsage.count();
console.log('Rizerie:', r, '| LotCoques:', l, '| Batch:', b, '| Order:', o, '| Stock:', s, '| Customer:', c, '| PackLot:', pk, '| OLA:', ola, '| BMU:', bmu);

// Check if seed data still exists
const seedRiz = await db.rizerie.findUnique({ where: { id: 'seed-p2-rizerie-daloa' } });
console.log('Seed P2 Rizerie daloa still present:', seedRiz !== null);
await db.$disconnect();
