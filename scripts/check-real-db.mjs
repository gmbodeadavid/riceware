import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL || '(DATABASE_URL non défini)';
console.log('DATABASE_URL:', url);

// Guard : refus sur la base réelle si le chemin contient "dev.db" ou "riceware.db" (base prod)
// On tourne uniquement si DATABASE_URL pointe vers une copie explicite
// (le guard n'est pas activé ici car ce script est en lecture seule — audit uniquement)

const db = new PrismaClient();

async function main() {
  const [riz, lots, batches, orders, stock, stmv, packLots, ola] = await Promise.all([
    db.rizerie.count(),
    db.lotCoques.count(),
    db.batchProduction.count(),
    db.order.count(),
    db.stock.aggregate({ _sum: { quantity: true } }),
    db.stockMovement.count(),
    db.packLot.count(),
    db.orderLineAllocation.count(),
  ]);

  console.log('--- Comptages base réelle ---');
  console.log('Rizerie              :', riz);
  console.log('LotCoques            :', lots);
  console.log('BatchProduction      :', batches);
  console.log('Order                :', orders);
  console.log('Stock.quantity (sum) :', stock._sum.quantity);
  console.log('StockMovement        :', stmv);
  console.log('PackLot              :', packLots);
  console.log('OrderLineAllocation  :', ola);

  // Chercher des lignes de seed P2 résiduelles
  const seedOrders = await db.order.findMany({
    where: { orderNumber: { startsWith: 'RW-CMD-P2' } },
    select: { id: true, orderNumber: true, totalAmount: true }
  });
  console.log('\n--- Commandes seed P2 résiduelles (orderNumber LIKE RW-CMD-P2-%) ---');
  if (seedOrders.length === 0) console.log('  Aucune');
  else seedOrders.forEach(o => console.log(' ', JSON.stringify(o)));

  // ProductPack suspects
  const packs = await db.productPack.findMany({
    select: { id: true, label: true, packKey: true, quantity: true, price: true }
  });
  console.log('\n--- ProductPacks (tous) ---');
  packs.forEach(p => console.log(' ', JSON.stringify(p)));

  // Lots de coques avec status "rappel" ou "recalled"
  const recalledLots = await db.lotCoques.findMany({
    where: { OR: [{ status: 'recalled' }, { status: 'rappel' }] },
    select: { id: true, code: true, status: true }
  });
  console.log('\n--- LotCoques avec status rappel/recalled ---');
  if (recalledLots.length === 0) console.log('  Aucun');
  else recalledLots.forEach(l => console.log(' ', JSON.stringify(l)));

  // PackLots avec status rappel
  const recalledPacks = await db.packLot.findMany({
    where: { status: 'rappel' },
    select: { id: true, code: true, status: true }
  });
  console.log('\n--- PackLots avec status "rappel" ---');
  if (recalledPacks.length === 0) console.log('  Aucun');
  else recalledPacks.forEach(p => console.log(' ', JSON.stringify(p)));
}

main().catch(console.error).finally(() => db.$disconnect());
