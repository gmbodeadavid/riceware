export function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export function toIsoRequired(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
