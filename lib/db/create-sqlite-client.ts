import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForSqlite = globalThis as unknown as {
  sqliteAdapter?: PrismaBetterSqlite3;
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
    throw new Error('DATABASE_URL은 SQLite file: 형식이어야 합니다.');
  }
  return url;
}

export function createSqlitePrismaClient(): PrismaClient {
  if (globalForSqlite.sqlitePrisma) {
    return globalForSqlite.sqlitePrisma;
  }

  const url = resolveSqliteUrl();
  if (!globalForSqlite.sqliteAdapter) {
    globalForSqlite.sqliteAdapter = new PrismaBetterSqlite3({ url });
  }

  const client = new PrismaClient({ adapter: globalForSqlite.sqliteAdapter });
  globalForSqlite.sqlitePrisma = client;
  return client;
}
