export type DatabaseProviderName = "sqlite" | "turso";

export function resolveDatabaseProvider(): DatabaseProviderName {
  const raw = (process.env.DATABASE_PROVIDER ?? "").trim().toLowerCase();
  const onVercel = process.env.VERCEL === "1";
  const hasTursoUrl = Boolean(process.env.TURSO_DATABASE_URL?.trim());

  if (raw === "turso") {
    return "turso";
  }

  if (raw === "sqlite") {
    // Vercel에 sqlite가 잘못 설정된 경우 Turso URL이 있으면 turso 사용
    if (onVercel && hasTursoUrl) {
      return "turso";
    }
    return "sqlite";
  }

  if (raw !== "") {
    throw new Error(
      `DATABASE_PROVIDER="${raw}"는 지원하지 않습니다. "sqlite" 또는 "turso"를 사용하세요.`,
    );
  }

  // 미설정: Vercel 운영은 turso, 로컬은 sqlite
  if (onVercel) {
    return "turso";
  }

  return "sqlite";
}

export function isProductionEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

/** Next.js production build (page data collection, static analysis). */
export function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function assertProductionDatabaseProvider(): void {
  if (isNextBuildPhase()) return;
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
