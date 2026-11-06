// @ts-check
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const url = process.env.DATABASE_URL ?? 'NOT SET';
console.log('DATABASE_URL:', url.replace(/:([^:@]+)@/, ':***@'));

const [riz, lot, bat, ord, stk, mvt, pk, alloc, cust, notif, pp] = await Promise.all([
  prisma.rizerie.count(),
  prisma.lotCoques.count(),
  prisma.batchProduction.count(),
  prisma.order.count(),
  prisma.stock.count(),
  prisma.stockMovement.count(),
  prisma.packLot.count(),
  prisma.orderLineAllocation.count(),
  prisma.customer.count(),
  prisma.notification.count(),
  prisma.productPack.count(),
]);
console.log({ Rizerie: riz, LotCoques: lot, BatchProduction: bat, Order: ord, Stock: stk, StockMovement: mvt, PackLot: pk, OrderLineAllocation: alloc, Customer: cust, Notification: notif, ProductPack: pp });

const packs = await prisma.productPack.findMany({ select: { id: true, label: true, price: true }, orderBy: { id: 'asc' } });
console.log('\nProductPacks:', JSON.stringify(packs, null, 2));

const orders = await prisma.order.findMany({ select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalAmount: true } });
console.log('\nOrders:', JSON.stringify(orders, null, 2));

await prisma.$disconnect();
