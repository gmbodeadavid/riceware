import { prisma } from '@/lib/db';

function dayStamp(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Génère un identifiant lisible : `RW-2026-10-25-001`.
 * Le compteur repart à 001 chaque jour.
 */
export async function nextTraceabilityCode(date = new Date()): Promise<string> {
  const prefix = `RW-${dayStamp(date)}-`;
  const last = await prisma.lotCoques.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const lastCounter = last ? Number.parseInt(last.code.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastCounter + 1).padStart(3, '0')}`;
}

/** Génère un identifiant de batch : `RW-BAT-2026-10-25-001`. */
export async function nextBatchCode(date = new Date()): Promise<string> {
  const prefix = `RW-BAT-${dayStamp(date)}-`;
  const last = await prisma.batchProduction.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const lastCounter = last ? Number.parseInt(last.code.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastCounter + 1).padStart(3, '0')}`;
}
