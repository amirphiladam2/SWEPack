/**
 * Prisma 8 reports constraint violations as SQL driver errors carrying the
 * Postgres SQLSTATE, not as Prisma 7's `P2002`/`P2025` request errors.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'sqlState' in error &&
    (error as { sqlState?: unknown }).sqlState === '23505'
  );
}
