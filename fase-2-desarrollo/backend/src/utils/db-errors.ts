/**
 * P2002 es el código de Prisma para una violación de restricción UNIQUE.
 * Se compara por código y no por clase para no acoplar los servicios al cliente.
 */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

/** Los Decimal de Prisma (honorScore, tasas) salen como number o null en la API. */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
