const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.batchProduction.findMany({ select: { id: true, code: true, lotId: true }, where: { deletedAt: null } }),
  p.orderLine.findMany({ select: { id: true, orderId: true, productPackId: true, packNameSnapshot: true, quantity: true } }),
  p.stockMovement.findMany({ select: { id: true, reference: true }, take: 10 }),
  p.lotCoques.findMany({ select: { id: true, code: true }, where: { deletedAt: null } }),
]).then(([batches, lines, movements, lots]) => {
  console.log('BATCHES:', JSON.stringify(batches, null, 2));
  console.log('ORDER_LINES:', JSON.stringify(lines, null, 2));
  console.log('MOVEMENTS_SAMPLE:', JSON.stringify(movements, null, 2));
  console.log('LOTS:', JSON.stringify(lots, null, 2));
  p.$disconnect();
});
