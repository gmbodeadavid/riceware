const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.batchProduction.findMany({ orderBy: { startedAt: 'desc' }, take: 5, include: { lot: { select: { code: true } } } }),
  prisma.lotCoques.findMany({ orderBy: { receivedAt: 'desc' }, take: 5 }),
  prisma.order.findMany({ select: { orderNumber: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true } }),
  prisma.stock.findMany({ take: 10, include: { movements: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
  prisma.testQualite.groupBy({ by: ['result'], _count: { _all: true } }),
]).then(function(r) {
  var batches = r[0], lots = r[1], orders = r[2], stocks = r[3], tests = r[4];
  console.log('=== BATCHES ===');
  batches.forEach(function(b) {
    console.log(b.code, b.startedAt.toISOString().slice(0,10), 'pieces:', b.piecesProduced, 'rejects:', b.rejects,
      'cost:', b.powderCostFcfa + b.binderCostFcfa + b.laborCostFcfa + b.energyCostFcfa);
  });
  console.log('\n=== LOTS ===');
  lots.forEach(function(l) {
    console.log(l.code, l.receivedAt.toISOString().slice(0,10), 'netKg:', l.netWeightKg, 'status:', l.status);
  });
  console.log('\n=== ORDERS ===');
  orders.forEach(function(o) {
    console.log(o.orderNumber, o.status, o.paymentStatus, o.totalAmount + ' FCFA', o.createdAt.toISOString().slice(0,10));
  });
  console.log('\n=== STOCKS ===');
  stocks.forEach(function(s) {
    console.log(s.label, 'qty:', s.quantity, s.unit, 'seuil:', s.minThreshold);
  });
  console.log('\n=== TESTS ===');
  tests.forEach(function(t) { console.log(t.result, ':', t._count._all); });
  return prisma.$disconnect();
}).catch(function(e) { console.error(e.message); return prisma.$disconnect(); });
