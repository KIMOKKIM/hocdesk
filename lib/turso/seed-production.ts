import { createTursoPrismaClient } from "@/lib/db/create-turso-client";
import { assessDatabaseReadiness } from "@/lib/db/readiness";
import { hasTursoEnv } from "@/lib/db/turso-env";
import { seedOperationalProject } from "@/lib/seed/operational-seed";
import { TursoSetupError } from "@/lib/turso/setup-schema";

export type SeedProductionResult = {
  applied: boolean;
  counts: {
    projects: number;
    companies: number;
    appSettings: number;
  };
};

export async function seedTursoProduction(): Promise<SeedProductionResult> {
  if (!hasTursoEnv()) {
    throw new TursoSetupError(
      "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.",
      "TURSO_ENV_MISSING",
    );
  }

  process.env.DATABASE_PROVIDER = "turso";
  const prisma = createTursoPrismaClient();

  try {
    const before = await assessDatabaseReadiness(prisma);
    if (!before.schemaReady) {
      throw new TursoSetupError(
        "schema가 준비되지 않았습니다. 먼저 schema를 적용하세요.",
        "TURSO_SCHEMA_REQUIRED",
      );
    }

    await seedOperationalProject(prisma);

    const [projects, companies, appSettings] = await Promise.all([
      prisma.project.count(),
      prisma.company.count(),
      prisma.appSetting.count(),
    ]);

    const after = await assessDatabaseReadiness(prisma);
    if (!after.seedReady) {
      throw new TursoSetupError(
        "운영 DB seed 적용 후 진웅산업 프로젝트를 확인하지 못했습니다.",
        "TURSO_SEED_FAILED",
      );
    }

    return {
      applied: true,
      counts: { projects, companies, appSettings },
    };
  } catch (error) {
    if (error instanceof TursoSetupError) throw error;
    throw new TursoSetupError(
      "운영 DB seed 생성 중 오류가 발생했습니다.",
      "TURSO_SEED_FAILED",
    );
  } finally {
    await prisma.$disconnect();
  }
}
