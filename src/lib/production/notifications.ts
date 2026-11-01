import { prisma } from '@/lib/db';
import { formatNumber, formatPercent } from '@/lib/format';

type NotificationInput = {
  type: string;
  level?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  whatsapp?: boolean;
};

/**
 * Envoi WhatsApp optionnel. L’intégration reste désactivée tant que les
 * variables WHATSAPP_* ne sont pas renseignées : aucune dépendance externe
 * n’est requise pour faire tourner l’application.
 */
export async function sendWhatsAppMessage(message: string): Promise<boolean> {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  const recipient = process.env.WHATSAPP_RECIPIENT;

  if (!url || !token || !recipient) return false;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: message },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('Notification WhatsApp refusée :', response.status, await response.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Notification WhatsApp impossible :', error);
    return false;
  }
}

export async function createNotification(input: NotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      type: input.type,
      level: input.level ?? 'info',
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });

  if (input.whatsapp) {
    await sendWhatsAppMessage(`[RiceWare CI] ${input.title}\n${input.message}`);
  }

  return notification;
}

export async function alertIfStockLow(stock: {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  minThreshold: number;
}): Promise<void> {
  if (!stock.minThreshold || stock.quantity > stock.minThreshold) return;

  const existing = await prisma.notification.findFirst({
    where: {
      type: 'stock_low',
      entityType: 'stock',
      entityId: stock.id,
      read: false,
    },
  });
  if (existing) return;

  await createNotification({
    type: 'stock_low',
    level: 'warning',
    title: 'Stock sous le seuil minimum',
    message: `${stock.label} : ${formatNumber(stock.quantity, stock.unit)} restant(s), seuil ${formatNumber(stock.minThreshold, stock.unit)}.`,
    entityType: 'stock',
    entityId: stock.id,
    whatsapp: true,
  });
}

export async function alertIfRejectRateHigh(input: {
  batchId: string;
  batchCode: string;
  ratePct: number;
  thresholdPct: number;
}): Promise<void> {
  if (input.ratePct <= input.thresholdPct) return;

  await createNotification({
    type: 'reject_rate',
    level: 'danger',
    title: 'Taux de rebut élevé',
    message: `Le batch ${input.batchCode} atteint ${formatPercent(input.ratePct)} de rebut (seuil ${formatPercent(input.thresholdPct)}).`,
    entityType: 'batch',
    entityId: input.batchId,
    whatsapp: true,
  });
}

export async function alertQualityFailure(input: {
  testId: string;
  testLabel: string;
  reference: string;
}): Promise<void> {
  await createNotification({
    type: 'quality_failed',
    level: 'danger',
    title: 'Test qualité en échec',
    message: `${input.testLabel} en échec pour ${input.reference}. Vérifiez le batch et les réglages de production.`,
    entityType: 'test',
    entityId: input.testId,
  });
}
