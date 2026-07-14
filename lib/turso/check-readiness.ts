import { createTursoPrismaClient } from "@/lib/db/create-turso-client";
import {
  assessDatabaseReadiness,
  checkTursoTables,
  type DatabaseReadinessResult,
} from "@/lib/db/readiness";
import { hasTursoEnv } from "@/lib/db/turso-env";
import type { TursoTableCheckMap } from "@/lib/db/turso-tables";
import { TursoSetupError } from "@/lib/turso/setup-schema";

export type TursoReadinessCheck = DatabaseReadinessResult & {
  tableChecks: TursoTableCheckMap;
  counts: {
    projects: number;
    companies: number;
    appSettings: number;
  };
};

export async function checkTursoReadiness(): Promise<TursoReadinessCheck> {
  if (!hasTursoEnv()) {
    throw new TursoSetupError(
      "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.",
      "TURSO_ENV_MISSING",
    );
  }

  process.env.DATABASE_PROVIDER = "turso";
  const prisma = createTursoPrismaClient();

  try {
    const readiness = await assessDatabaseReadiness(prisma);
    const tableChecks = await checkTursoTables(prisma);

    let counts = { projects: 0, companies: 0, appSettings: 0 };
    if (readiness.schemaReady) {
      const [projects, companies, appSettings] = await Promise.all([
        prisma.project.count(),
        prisma.company.count(),
        prisma.appSetting.count(),
      ]);
      counts = { projects, companies, appSettings };
    }

    return { ...readiness, tableChecks, counts };
  } finally {
    await prisma.$disconnect();
  }
}

export type TursoFullSetupResult = {
  success: true;
  schemaApplied: boolean;
  seedApplied: boolean;
  schemaReady: boolean;
  seedReady: boolean;
  counts: {
    projects: number;
    companies: number;
    appSettings: number;
  };
};

/**
 * Full Turso bootstrap: readiness → schema → seed → re-check.
 * Idempotent; never deletes existing data.
 */
export async function runTursoFullSetup(): Promise<TursoFullSetupResult> {
  const provider = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
  // Allow unset provider when Turso credentials exist (Vercel default path)
  if (provider && provider !== "turso") {
    throw new TursoSetupError(
      "DATABASE_PROVIDER=turso 일 때만 운영 DB 초기화를 실행할 수 있습니다.",
      "TURSO_PROVIDER_MISMATCH",
    );
  }

  if (!hasTursoEnv()) {
    throw new TursoSetupError(
      "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.",
      "TURSO_ENV_MISSING",
    );
  }

  process.env.DATABASE_PROVIDER = "turso";

  const { applyTursoSchema } = await import("@/lib/turso/setup-schema");
  const { seedTursoProduction } = await import("@/lib/turso/seed-production");

  let schemaApplied = false;
  let seedApplied = false;

  const before = await checkTursoReadiness();
  if (!before.schemaReady) {
    await applyTursoSchema();
    schemaApplied = true;
  }

  const mid = await checkTursoReadiness();
  if (!mid.schemaReady) {
    throw new TursoSetupError(
      "운영 DB schema 생성 중 오류가 발생했습니다.",
      "TURSO_SCHEMA_FAILED",
    );
  }

  const seed = await seedTursoProduction();
  seedApplied = seed.applied;

  const after = await checkTursoReadiness();
  if (!after.schemaReady || !after.seedReady) {
    throw new TursoSetupError(
      "초기화 후에도 운영 DB가 준비되지 않았습니다.",
      "TURSO_SETUP_INCOMPLETE",
    );
  }

  return {
    success: true,
    schemaApplied,
    seedApplied,
    schemaReady: after.schemaReady,
    seedReady: after.seedReady,
    counts: after.counts,
  };
}
