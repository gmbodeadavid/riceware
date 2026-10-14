'use server';

import fs from 'node:fs';
import path from 'node:path';
import {
  EntityId,
  IsoDateTime,
  Order,
  OrderStatus,
  PaymentStatus,
  Customer,
  OrderLine,
  MoneyAmount,
  SalesChannel,
  generateOrderNumber,
  getOrderSubtotal,
  getOrderTotal,
} from '@/lib/ricewareModels';

const ORDERS_KEY = 'riceware:ecommerce:orders';
const CUSTOMERS_KEY = 'riceware:ecommerce:customers';

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window !== 'undefined') return fallback;
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'data', `${key}.json`), 'utf-8');
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') return;
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(value, null, 2));
}

function getCurrentTimestamp(): IsoDateTime {
  return new Date().toISOString();
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function getCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ customers: Customer[]; total: number }> {
  const customers = readStorage<Customer[]>(CUSTOMERS_KEY, []);
  let filtered = [...customers];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.email?.toLowerCase().includes(s),
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = filtered.length;

  if (filters?.offset) filtered = filtered.slice(filters.offset);
  if (filters?.limit) filtered = filtered.slice(0, filters.limit);

  return { customers: filtered, total };
}

export async function getCustomer(id: EntityId): Promise<Customer | null> {
  const customers = readStorage<Customer[]>(CUSTOMERS_KEY, []);
  return customers.find((c) => c.id === id) ?? null;
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
  const customers = readStorage<Customer[]>(CUSTOMERS_KEY, []);
  const customer: Customer = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: getCurrentTimestamp(),
  };
  writeStorage(CUSTOMERS_KEY, [customer, ...customers]);
  return customer;
}

export async function updateCustomer(id: EntityId, data: Partial<Customer>): Promise<Customer> {
  const customers = readStorage<Customer[]>(CUSTOMERS_KEY, []);
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) throw new Error('Client non trouvé');
  const updated = { ...customers[index], ...data };
  customers[index] = updated;
  writeStorage(CUSTOMERS_KEY, customers);
  return updated;
}

export async function deleteCustomer(id: EntityId): Promise<void> {
  const customers = readStorage<Customer[]>(CUSTOMERS_KEY, []);
  writeStorage(CUSTOMERS_KEY, customers.filter((c) => c.id !== id));
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export async function getOrders(filters?: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: EntityId;
  channel?: SalesChannel;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: Order[]; total: number }> {
  const orders = readStorage<Order[]>(ORDERS_KEY, []);
  let filtered = [...orders];

  if (filters?.status) filtered = filtered.filter((o) => o.status === filters.status);
  if (filters?.paymentStatus) filtered = filtered.filter((o) => o.paymentStatus === filters.paymentStatus);
  if (filters?.customerId) filtered = filtered.filter((o) => o.customerId === filters.customerId);
  if (filters?.channel) filtered = filtered.filter((o) => o.channel === filters.channel);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(s) ||
        o.notes?.toLowerCase().includes(s),
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = filtered.length;

  if (filters?.offset) filtered = filtered.slice(filters.offset);
  if (filters?.limit) filtered = filtered.slice(0, filters.limit);

  return { orders: filtered, total };
}

export async function getOrder(id: EntityId): Promise<Order | null> {
  const orders = readStorage<Order[]>(ORDERS_KEY, []);
  return orders.find((o) => o.id === id) ?? null;
}

export async function createOrder(data: {
  customerId: EntityId;
  deliveryAddressId: EntityId;
  channel: SalesChannel;
  lines: Omit<OrderLine, 'id'>[];
  deliveryFee: MoneyAmount;
  notes?: string;
}): Promise<Order> {
  const orders = readStorage<Order[]>(ORDERS_KEY, []);
  const now = getCurrentTimestamp();

  const lines: OrderLine[] = data.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
  }));

  const subtotal = getOrderSubtotal(lines);
  const total = getOrderTotal(subtotal, data.deliveryFee);

  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(),
    customerId: data.customerId,
    deliveryAddressId: data.deliveryAddressId,
    channel: data.channel,
    status: 'received',
    paymentStatus: 'pending',
    lines,
    subtotal,
    deliveryFee: data.deliveryFee,
    total,
    createdAt: now,
    notes: data.notes,
  };

  writeStorage(ORDERS_KEY, [order, ...orders]);
  return order;
}

export async function updateOrderStatus(id: EntityId, status: OrderStatus): Promise<Order> {
  const orders = readStorage<Order[]>(ORDERS_KEY, []);
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) throw new Error('Commande non trouvée');

  const now = getCurrentTimestamp();
  const updated: Order = {
    ...orders[index],
    status,
    confirmedAt: status === 'confirmed' ? now : orders[index].confirmedAt,
    preparedAt: status === 'shipped' ? now : orders[index].preparedAt,
    deliveredAt: status === 'delivered' ? now : orders[index].deliveredAt,
    cancelledAt: status === 'cancelled' ? now : orders[index].cancelledAt,
  };

  orders[index] = updated;
  writeStorage(ORDERS_KEY, orders);
  return updated;
}

export async function updatePaymentStatus(id: EntityId, paymentStatus: PaymentStatus): Promise<Order> {
  const orders = readStorage<Order[]>(ORDERS_KEY, []);
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) throw new Error('Commande non trouvée');

  const updated = { ...orders[index], paymentStatus };
  orders[index] = updated;
  writeStorage(ORDERS_KEY, orders);
  return updated;
}

export async function deleteOrder(id: EntityId): Promise<void> {
  const orders = readStorage<Order[]>(ORDERS_KEY, []);
  writeStorage(ORDERS_KEY, orders.filter((o) => o.id !== id));
}

// ─── Order Stats ─────────────────────────────────────────────────────────────

export async function getOrderStats(): Promise<{
  total: number;
  received: number;
  confirmed: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  pendingPayment: number;
  paid: number;
  totalRevenuePaid: number;
}> {
  const { orders } = await getOrders();

  return {
    total: orders.length,
    received: orders.filter((o) => o.status === 'received').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    pendingPayment: orders.filter((o) => o.paymentStatus === 'pending').length,
    paid: orders.filter((o) => o.paymentStatus === 'paid').length,
    totalRevenuePaid: orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total.amount, 0),
  };
}

// Re-export types for convenience
export type { OrderStatus, PaymentStatus, SalesChannel };
