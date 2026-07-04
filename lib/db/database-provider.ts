export type DatabaseProviderName = "sqlite" | "turso";

export function resolveDatabaseProvider(): DatabaseProviderName {
  const raw = (process.env.DATABASE_PROVIDER ?? "sqlite").trim().toLowerCase();

  if (raw === "sqlite" || raw === "turso") {
    return raw;
  }

  throw new Error(
    `DATABASE_PROVIDER="${raw}"는 지원하지 않습니다. "sqlite" 또는 "turso"를 사용하세요.`,
  );
}

export function isProductionEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

export function assertProductionDatabaseProvider(): void {
  if (!isProductionEnvironment()) return;

  const provider = resolveDatabaseProvider();
  if (provider === "sqlite") {
    throw new Error(
      "운영 환경에서는 DATABASE_PROVIDER=turso가 필요합니다. SQLite dev.db는 Vercel 운영 DB로 사용할 수 없습니다.",
    );
  }
}

export function getDatabaseProviderLabel(): DatabaseProviderName {
  try {
    return resolveDatabaseProvider();
  } catch {
    return "sqlite";
  }
}
