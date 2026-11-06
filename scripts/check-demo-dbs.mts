import { PrismaClient } from '@prisma/client';

const urls = [
  'file:./prisma/dev-p2check.db',
  'file:./prisma/clean-test.db',
  'file:./prisma/dev-final.db',
];

for (const url of urls) {
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const packLots = await db.packLot.count();
    const ola = await db.orderLineAllocation.count();
    const bmu = await db.batchMaterialUsage.count();
    const orders = await db.order.count();
    console.log(`${url}: packLots=${packLots}, OLA=${ola}, BMU=${bmu}, orders=${orders}`);
  } catch (e) {
    console.log(`${url}: ERREUR ${(e as Error).message}`);
  } finally {
    await db.$disconnect();
  }
}
