import { PrismaClient } from "@/app/generated/prisma/client";
import { isNextBuildPhase } from "@/lib/db/database-provider";

const globalForSqlite = globalThis as unknown as {
  sqliteAdapter?: import("@prisma/adapter-better-sqlite3").PrismaBetterSqlite3;
  sqlitePrisma?: PrismaClient;
};

function resolveSqliteUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. 예: DATABASE_URL="file:./dev.db"',
    );
  }
  if (!url.startsWith("file:")) {
    throw new Error("DATABASE_URL은 SQLite file: 형식이어야 합니다.");
  }
  return url;
}

export function createSqlitePrismaClient(): PrismaClient {
  if (globalForSqlite.sqlitePrisma) {
    return globalForSqlite.sqlitePrisma;
  }

  if (isNextBuildPhase()) {
    throw new Error("SQLite Prisma client cannot be created during Next.js build.");
  }

  const url = resolveSqliteUrl();
  /* eslint-disable @typescript-eslint/no-require-imports -- avoid loading better-sqlite3 unless sqlite provider is active */
  const { PrismaBetterSqlite3 } =
    require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (!globalForSqlite.sqliteAdapter) {
    globalForSqlite.sqliteAdapter = new PrismaBetterSqlite3({ url });
  }

  const client = new PrismaClient({ adapter: globalForSqlite.sqliteAdapter });
  globalForSqlite.sqlitePrisma = client;
  return client;
}
