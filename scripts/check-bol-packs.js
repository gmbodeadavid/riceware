const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.productPack.findMany({
  select: { id: true, label: true, productId: true },
  orderBy: { productId: 'asc' }
}).then(r => { console.log(JSON.stringify(r, null, 2)); return p.$disconnect(); });
