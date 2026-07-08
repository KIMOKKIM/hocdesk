const PRISMA_SETUP_ERROR_CODES = new Set([
  "P1000",
  "P1001",
  "P1003",
  "P1010",
  "P1012",
  "P2010",
  "P2021",
  "P2022",
]);

export const DB_SETUP_COMMANDS = [
  "npx prisma generate",
  "npx prisma db push",
  "npx prisma db seed",
] as const;

export const TURSO_SETUP_COMMANDS = [
  "npx tsx scripts/push-schema-to-turso.ts --apply",
  "npx tsx scripts/seed-turso.ts --apply",
  "npm run turso:test",
] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function isDatabaseSetupError(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (PRISMA_SETUP_ERROR_CODES.has(code)) {
      return true;
    }
  }

  const message = getErrorMessage(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes("database_url") ||
    message.includes("turso_database_url") ||
    message.includes("turso_auth_token") ||
    message.includes("unable to open") ||
    message.includes("no such table") ||
    message.includes("does not exist") ||
    message.includes("database_not_ready") ||
    message.includes("libsql") ||
    message.includes("sqlite") ||
    message.includes("prisma client") ||
    (message.includes("table") && message.includes("not found"))
  );
}

export async function loadPageData<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DatabaseNotReadyError || isDatabaseSetupError(error)) {
      return null;
    }
    throw error;
  }
}

export async function runDatabaseQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      throw new DatabaseNotReadyError(error);
    }
    throw error;
  }
}

export class DatabaseNotReadyError extends Error {
  readonly causeError: unknown;

  constructor(cause: unknown) {
    super("DATABASE_NOT_READY");
    this.name = "DatabaseNotReadyError";
    this.causeError = cause;
  }
}
