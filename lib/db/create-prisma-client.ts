import "server-only";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { createSqlitePrismaClient } from "@/lib/db/create-sqlite-client";
import { createTursoPrismaClient } from "@/lib/db/create-turso-client";
import {
  assertProductionDatabaseProvider,
  resolveDatabaseProvider,
} from "@/lib/db/database-provider";

export function createPrismaClient(): PrismaClient {
  assertProductionDatabaseProvider();
  const provider = resolveDatabaseProvider();

  if (provider === "turso") {
    return createTursoPrismaClient();
  }

  return createSqlitePrismaClient();
}

export function isSqliteDatabase(): boolean {
  try {
    return resolveDatabaseProvider() === "sqlite";
  } catch {
    return (process.env.DATABASE_URL ?? "").startsWith("file:");
  }
}
