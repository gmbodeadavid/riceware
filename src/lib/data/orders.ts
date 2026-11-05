import { prisma } from '@/lib/db';
import { mapAddress, mapCustomer, mapOrder, mapPublicOrder, type MappedOrder, type PublicOrderSummary } from '@/lib/data/mappers';
import type { Customer, Address, OrderStatus, PaymentStatus, SalesChannel } from '@/lib/ricewareModels';
import { generateOrderNumber } from '@/lib/ricewareModels';
import type { Prisma } from '@prisma/client';
import { cancelOrderAllocations } from '@/lib/traceability';

const orderInclude = {
  lines: true,
  customer: true,
  deliveryAddress: true,
} satisfies Prisma.OrderInclude;

function parsePrice(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits || value.includes('confirmer')) return 0;
  return Number.parseInt(digits, 10);
}

export async function listCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ customers: Customer[]; total: number }> {
  const where: Prisma.CustomerWhereInput = filters?.search
    ? {
        deletedAt: null,
        OR: [
          { fullName: { contains: filters.search } },
          { phone: { contains: filters.search } },
          { email: { contains: filters.search } },
        ],
      }
    : { deletedAt: null };

  const [total, rows] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters?.offset,
      take: filters?.limit,
    }),
  ]);

  return { customers: rows.map(mapCustomer), total };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = await prisma.customer.findUnique({ where: { id } });
  return row ? mapCustomer(row) : null;
}

export async function getAddressById(id: string): Promise<Address | null> {
  const row = await prisma.address.findUnique({ where: { id } });
  return row ? mapAddress(row) : null;
}

export async function listOrders(filters?: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  channel?: SalesChannel;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: MappedOrder[]; total: number }> {
  const where: Prisma.OrderWhereInput = { deletedAt: null };
  if (filters?.status) where.status = filters.status;
  if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters?.customerId) where.customerId = filters.customerId;
  if (filters?.channel) where.channel = filters.channel;
  if (filters?.search) {
    where.OR = [
      { orderNumber: { contains: filters.search } },
      { notes: { contains: filters.search } },
      { customer: { fullName: { contains: filters.search } } },
    ];
  }

  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: filters?.offset,
      take: filters?.limit,
    }),
  ]);

  return { orders: rows.map(mapOrder), total };
}

export async function getOrderById(id: string): Promise<MappedOrder | null> {
  const row = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  return row ? mapOrder(row) : null;
}

export async function getPublicOrderByNumber(orderNumber: string): Promise<PublicOrderSummary | null> {
  const row = await prisma.order.findUnique({
    where: { orderNumber },
    include: { lines: true, customer: true },
  });
  return row ? mapPublicOrder(row) : null;
}

export type CheckoutPayload = {
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    city: string;
    district?: string;
    addressDetails: string;
    deliveryInstructions?: string;
    channel: SalesChannel;
  };
  paymentPlan?: string;
  deliveryOption?: string;
  paymentMethod?: string;
  items: Array<{ productPackId: string; quantity: number }>;
};

export async function createCheckoutOrder(payload: CheckoutPayload): Promise<PublicOrderSummary> {
  if (!payload.items.length) throw new Error('Le panier est vide.');
  if (!payload.customer.fullName.trim() || !payload.customer.phone.trim() || !payload.customer.addressDetails.trim()) {
    throw new Error('Nom, téléphone et adresse sont obligatoires.');
  }

  const packIds = payload.items.map((item) => item.productPackId);
  const packs = await prisma.productPack.findMany({
    where: { id: { in: packIds } },
    include: { product: true },
  });
  const packById = new Map(packs.map((pack) => [pack.id, pack]));

  const lines = payload.items.map((item) => {
    const pack = packById.get(item.productPackId);
    if (!pack) throw new Error('Un conditionnement du panier n’est plus disponible.');
    const quantity = Math.min(99, Math.max(1, item.quantity));
    const unitPriceAmount = parsePrice(pack.price);
    return {
      productId: pack.productId,
      productPackId: pack.id,
      packNameSnapshot: `${pack.product.name} · ${pack.label}`,
      packContentSnapshot: [
        {
          productId: pack.productId,
          productNameSnapshot: pack.product.name,
          quantity: pack.quantity,
        },
      ],
      quantity,
      unitPriceAmount,
      lineTotalAmount: unitPriceAmount * quantity,
      packQuantity: pack.quantity,
    };
  });

  const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotalAmount, 0);
  const notes = 'Demande enregistrée. Les prix, les modalités de paiement et la livraison restent à confirmer par RiceWare CI. Aucun paiement n’a été prélevé.';

  const created = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        fullName: payload.customer.fullName.trim(),
        phone: payload.customer.phone.trim(),
        email: payload.customer.email?.trim() || null,
      },
    });

    const address = await tx.address.create({
      data: {
        customerId: customer.id,
        city: payload.customer.city.trim() || 'Abidjan',
        district: payload.customer.district?.trim() || null,
        details: payload.customer.addressDetails.trim(),
        deliveryInstructions: payload.customer.deliveryInstructions?.trim() || null,
      },
    });

    return tx.order.create({
      data: {
        orderNumber: generateOrderNumber('RW-CMD'),
        customerId: customer.id,
        deliveryAddressId: address.id,
        channel: payload.customer.channel,
        status: 'received',
        paymentStatus: 'pending',
        paymentPlan: payload.paymentPlan,
        deliveryOption: payload.deliveryOption,
        preferredPaymentMethod: payload.paymentMethod,
        subtotalAmount,
        deliveryFeeAmount: 0,
        totalAmount: subtotalAmount,
        notes,
        lines: { create: lines },
      },
      include: { lines: true, customer: true },
    });
  });

  return mapPublicOrder(created);
}

export async function updateOrderStatusRecord(id: string, status: OrderStatus): Promise<MappedOrder> {
  // Refus d'expédition si des lignes ne sont pas entièrement allouées
  if (status === 'shipped') {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        lines: {
          include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
        },
      },
    });
    if (order) {
      const incomplete = order.lines.filter((line) => {
        if (!line.productPackId) return false; // lignes sans pack ne sont pas allouées
        const allocated = line.allocations.reduce((s, a) => s + a.quantity, 0);
        return allocated < line.quantity;
      });
      if (incomplete.length > 0) {
        throw new Error(
          `Expédition impossible : ${incomplete.length} ligne(s) non allouée(s). Allouez les packs avant d'expédier.`,
        );
      }
    }
  }

  const now = new Date();
  const row = await prisma.order.update({
    where: { id },
    data: {
      status,
      confirmedAt: status === 'confirmed' ? now : undefined,
      preparedAt: status === 'shipped' ? now : undefined,
      deliveredAt: status === 'delivered' ? now : undefined,
      cancelledAt: status === 'cancelled' ? now : undefined,
    },
    include: orderInclude,
  });

  // Libérer les allocations si la commande est annulée
  if (status === 'cancelled') {
    await cancelOrderAllocations(id).catch((error) =>
      console.error('cancelOrderAllocations error:', error),
    );
  }

  return mapOrder(row);
}

export async function updatePaymentStatusRecord(id: string, paymentStatus: PaymentStatus): Promise<MappedOrder> {
  const row = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
    include: orderInclude,
  });
  return mapOrder(row);
}

export async function deleteOrderRecord(id: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, paymentStatus: true, status: true },
  });
  if (!order) throw new Error('Commande introuvable.');

  // Interdire la suppression d'une commande payée ou livrée, même pour un admin.
  // Une telle commande doit être annulée (statut 'cancelled'), jamais effacée.
  if (order.paymentStatus === 'paid') {
    throw new Error('Impossible de supprimer une commande payée. Utilisez le statut « Annulée » si nécessaire.');
  }
  if (order.status === 'delivered') {
    throw new Error('Impossible de supprimer une commande livrée. Utilisez le statut « Annulée » si nécessaire.');
  }

  const now = new Date();
  await prisma.order.update({ where: { id }, data: { deletedAt: now } });
}

export async function getOrderStats() {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    select: { status: true, paymentStatus: true, totalAmount: true },
  });

  return {
    total: orders.length,
    received: orders.filter((order) => order.status === 'received').length,
    confirmed: orders.filter((order) => order.status === 'confirmed').length,
    preparing: orders.filter((order) => order.status === 'preparing').length,
    shipped: orders.filter((order) => order.status === 'shipped').length,
    delivered: orders.filter((order) => order.status === 'delivered').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
    pendingPayment: orders.filter((order) => order.paymentStatus === 'pending').length,
    paid: orders.filter((order) => order.paymentStatus === 'paid').length,
    totalRevenuePaid: orders
      .filter((order) => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalAmount, 0),
  };
}
