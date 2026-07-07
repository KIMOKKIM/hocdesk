import "server-only";
import type { PrismaClient } from "@/app/generated/prisma/client";
import {
  assertProductionDatabaseProvider,
  isNextBuildPhase,
  resolveDatabaseProvider,
} from "@/lib/db/database-provider";

/* eslint-disable @typescript-eslint/no-require-imports -- load DB adapters only for the active provider */
export function createPrismaClient(): PrismaClient {
  assertProductionDatabaseProvider();
  const provider = resolveDatabaseProvider();

  if (provider === "turso") {
    const { createTursoPrismaClient } =
      require("@/lib/db/create-turso-client") as typeof import("@/lib/db/create-turso-client");
    return createTursoPrismaClient();
  }

  const { createSqlitePrismaClient } =
    require("@/lib/db/create-sqlite-client") as typeof import("@/lib/db/create-sqlite-client");
  return createSqlitePrismaClient();
}
/* eslint-enable @typescript-eslint/no-require-imports */

export function isSqliteDatabase(): boolean {
  try {
    return resolveDatabaseProvider() === "sqlite";
  } catch {
    return (process.env.DATABASE_URL ?? "").startsWith("file:");
  }
}

export function isPrismaClientAvailable(): boolean {
  if (isNextBuildPhase()) return false;
  return true;
}
