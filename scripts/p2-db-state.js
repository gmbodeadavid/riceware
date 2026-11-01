const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.rizerie.count(),
  p.lotCoques.count(),
  p.batchProduction.count(),
  p.order.count(),
  p.stock.count(),
  p.order.count({ where: { paymentStatus: 'paid' } }),
  p.orderLineAllocation.count(),
  p.packLot.count(),
  p.batchMaterialUsage.count(),
  p.order.findMany({ select: { id: true, orderNumber: true, paymentStatus: true, totalAmount: true, deletedAt: true }, orderBy: { createdAt: 'asc' } }),
]).then(([r,l,b,o,s,paid,alloc,pl,bmu,orders]) => {
  console.log(JSON.stringify({ rizerie:r, lot:l, batch:b, order:o, stock:s, paidOrders:paid, allocations:alloc, packLots:pl, batchMaterialUsages:bmu }, null, 2));
  console.log('ORDERS:', JSON.stringify(orders, null, 2));
  return p.$disconnect();
});
