import { prisma } from '@/lib/db';

export const DEFAULT_SETTINGS = {
  powderCostPerKg: '50',
  binderCostPerKg: '1500',
  laborCostPerBatch: '5000',
  energyCostPerBatch: '2500',
  rejectAlertPct: '10',
  stockCoquesMinKg: '100',
  stockPoudreMinKg: '50',
  stockLiantMinKg: '20',
  whatsappNumber: '',
  greenpreneurTargetPieces: '100000',
  companyName: 'RiceWare CI',
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type AppSettings = Record<SettingKey, string>;

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Partial<AppSettings>;

  return Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [key, values[key as SettingKey] ?? fallback]),
  ) as AppSettings;
}

export function settingNumber(settings: AppSettings, key: SettingKey, fallback = 0): number {
  const value = Number.parseFloat(settings[key]?.replace(',', '.') ?? '');
  return Number.isFinite(value) ? value : fallback;
}

export async function saveSettings(values: Record<string, string>): Promise<AppSettings> {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
  return getSettings();
}
