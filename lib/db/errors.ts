const PRISMA_SETUP_ERROR_CODES = new Set([
  "P1001",
  "P1003",
  "P1010",
  "P1012",
  "P2021",
]);

export const DB_SETUP_COMMANDS = [
  "npx prisma generate",
  "npx prisma db push",
  "npx prisma db seed",
] as const;

export function isDatabaseSetupError(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    if (PRISMA_SETUP_ERROR_CODES.has((error as { code: string }).code)) {
      return true;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("database_url") ||
      message.includes("unable to open") ||
      message.includes("no such table") ||
      message.includes("does not exist") ||
      message.includes("database_not_ready") ||
      message.includes("sqlite") ||
      message.includes("prisma client")
    );
  }

  return false;
}

export async function loadPageData<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DatabaseNotReadyError) {
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
