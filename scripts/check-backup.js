const { PrismaClient } = require('@prisma/client');
const path = require('path');

const backupPath = path.resolve(__dirname, '..', 'backups', 'riceware-2026-11-01-1319.db');
const url = `file:${backupPath}`;
console.log('Connecting to:', url);

const p = new PrismaClient({ datasources: { db: { url } } });
Promise.all([
  p.rizerie.count(),
  p.lotCoques.count(),
  p.batchProduction.count(),
  p.order.count(),
  p.stock.count(),
  p.batchMaterialUsage.count().catch(() => 'TABLE_MISSING'),
  p.packLot.count().catch(() => 'TABLE_MISSING'),
  p.orderLineAllocation.count().catch(() => 'TABLE_MISSING'),
]).then(([r,l,b,o,s,bmu,pl,alloc]) => {
  console.log(JSON.stringify({ rizerie:r, lot:l, batch:b, order:o, stock:s, bmu, packLot:pl, alloc }, null, 2));
  return p.$disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
