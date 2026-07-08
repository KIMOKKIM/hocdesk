#!/usr/bin/env npx tsx
/**
 * Turso 연결 및 readiness 테스트
 * npm run turso:test
 */
import "dotenv/config";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";
import { assessDatabaseReadiness, checkTursoTables } from "../lib/db/readiness";
import { hasTursoEnv, printTursoEnvStatus, requireTursoEnv } from "../lib/db/turso-env";
import { OPERATIONAL_PROJECT_ID } from "../lib/seed/operational-seed";

async function printRowCounts(prisma: ReturnType<typeof createTursoPrismaClient>) {
  const counts: Array<[string, number | string]> = [];

  const safeCount = async (label: string, fn: () => Promise<number>) => {
    try {
      counts.push([label, await fn()]);
    } catch {
      counts.push([label, "N/A (table missing)"]);
    }
  };

  await safeCount("Project", () => prisma.project.count());
  await safeCount("Company", () => prisma.company.count());
  await safeCount("AppSetting", () => prisma.appSetting.count());
  await safeCount("Outreach", () => prisma.outreach.count());

  console.log("\n=== Row counts ===");
  for (const [label, value] of counts) {
    console.log(`${label}: ${value}`);
  }
}

async function main() {
  printTursoEnvStatus();

  if (!hasTursoEnv()) {
    console.log("SKIP: TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 없음 — Turso 실연결 미검증");
    return;
  }

  requireTursoEnv();
  process.env.DATABASE_PROVIDER = "turso";

  const prisma = createTursoPrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ 연결 성공");

    const readiness = await assessDatabaseReadiness(prisma);
    const tableChecks = await checkTursoTables(prisma);
    const missing = Object.entries(tableChecks)
      .filter(([, ok]) => !ok)
      .map(([key]) => key);

    console.log("\n=== Readiness ===");
    console.log(`database: ${readiness.database}`);
    console.log(`schemaReady: ${readiness.schemaReady}`);
    console.log(`seedReady: ${readiness.seedReady}`);
    console.log(`projectTable: ${readiness.checks.projectTable}`);
    console.log(`companyTable: ${readiness.checks.companyTable}`);
    console.log(`appSettingTable: ${readiness.checks.appSettingTable}`);
    console.log(`jinwoongProject: ${readiness.checks.jinwoongProject}`);

    if (readiness.setupStep) {
      console.log(`setupStep: ${readiness.setupStep}`);
    }

    if (missing.length > 0) {
      console.log(`missing tables: ${missing.join(", ")}`);
    }

    await printRowCounts(prisma);

    if (readiness.checks.jinwoongProject) {
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { id: OPERATIONAL_PROJECT_ID },
            { name: { contains: "진웅산업" } },
          ],
        },
        select: { id: true, name: true },
      });
      console.log(`\n✓ 진웅산업 프로젝트: ${project?.name ?? "(found)"}`);
    } else if (readiness.schemaReady) {
      console.log("\n! schema는 있으나 진웅산업 프로젝트 seed 필요 → npm run turso:seed:apply");
    } else {
      console.log("\n! schema 필요 → npm run turso:schema:apply");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Turso test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
