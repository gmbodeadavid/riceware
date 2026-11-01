import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

type AuditInput = {
  userId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Journal d’audit applicatif. Une erreur d’écriture ne doit jamais faire
 * échouer l’action métier elle-même.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        actorName: input.actorName || 'système',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        details: (input.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error('Journal d’audit indisponible :', error);
  }
}
