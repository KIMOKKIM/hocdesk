#!/usr/bin/env npx tsx
/**
 * Turso 최소 운영 seed (데모 제외 기본)
 * npm run turso:seed
 * npm run turso:seed:apply
 * npm run turso:seed:apply -- --include-demo
 */
import "dotenv/config";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";
import { assessDatabaseReadiness } from "../lib/db/readiness";
import { printTursoEnvStatus, requireTursoEnv } from "../lib/db/turso-env";
import { seedOperationalProject } from "../lib/seed/operational-seed";

const apply = process.argv.includes("--apply");
const includeDemo = process.argv.includes("--include-demo");

async function printCounts(prisma: ReturnType<typeof createTursoPrismaClient>) {
  const [projectCount, appSettingCount, companyCount] = await Promise.all([
    prisma.project.count(),
    prisma.appSetting.count(),
    prisma.company.count(),
  ]);

  console.log("\n=== Seed counts ===");
  console.log(`Project: ${projectCount}`);
  console.log(`AppSetting: ${appSettingCount}`);
  console.log(`Company: ${companyCount}`);
}

async function main() {
  printTursoEnvStatus();
  requireTursoEnv();

  console.log(`\nTurso seed (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log("- 진웅산업 양주 공장 매각 프로젝트 (upsert)");
  console.log("- AppSetting 기본값 (upsert)");
  console.log(`- 데모 업체: ${includeDemo ? "포함 요청 (--include-demo)" : "제외 (기본)"}`);

  if (!apply) {
    console.log("\n적용하려면: npm run turso:seed:apply");
    return;
  }

  process.env.DATABASE_PROVIDER = "turso";
  const prisma = createTursoPrismaClient();
  try {
    const before = await assessDatabaseReadiness(prisma);
    if (!before.schemaReady) {
      console.error("\n✗ schema가 없습니다. 먼저 npm run turso:schema:apply 를 실행하세요.");
      process.exit(1);
    }

    await seedOperationalProject(prisma);

    if (includeDemo) {
      console.log("데모 업체 seed는 prisma/seed.ts 전체 실행으로 별도 처리하세요.");
    }

    await printCounts(prisma);

    const after = await assessDatabaseReadiness(prisma);
    if (after.seedReady) {
      console.log("\n✓ Turso operational seed 완료 — 진웅산업 프로젝트 준비됨");
    } else {
      console.log("\n! seed 후에도 진웅산업 프로젝트를 찾지 못했습니다.");
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("seed-turso failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
