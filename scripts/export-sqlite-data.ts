#!/usr/bin/env npx tsx
/**
 * 로컬 SQLite 데이터 export 요약 (dry-run 기본)
 * npx tsx scripts/export-sqlite-data.ts
 * npx tsx scripts/export-sqlite-data.ts --apply --out backup/export.json
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createSqlitePrismaClient } from "../lib/db/create-sqlite-client";

const apply = process.argv.includes("--apply");
const outIndex = process.argv.indexOf("--out");
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : "backup/sqlite-export.json";

async function main() {
  if (process.env.DATABASE_PROVIDER && process.env.DATABASE_PROVIDER !== "sqlite") {
    console.error("export는 DATABASE_PROVIDER=sqlite 환경에서 실행하세요.");
    process.exit(1);
  }

  const prisma = createSqlitePrismaClient();
  try {
    const summary = {
      projects: await prisma.project.count(),
      companies: await prisma.company.count(),
      projectCompanies: await prisma.projectCompany.count(),
      companySources: await prisma.companySource.count(),
      outreach: await prisma.outreach.count(),
      discoveredCandidates: await prisma.discoveredCandidate.count(),
      activityLogs: await prisma.activityLog.count(),
    };

    console.log("SQLite export summary:", summary);

    if (!apply) {
      console.log(`DRY-RUN: ${outPath} 파일을 생성하지 않았습니다.`);
      console.log("적용하려면 --apply --out <path> 옵션을 사용하세요.");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      summary,
      projects: await prisma.project.findMany(),
      companies: await prisma.company.findMany(),
      projectCompanies: await prisma.projectCompany.findMany(),
      appSettings: await prisma.appSetting.findMany(),
    };

    writeFileSync(outPath, JSON.stringify(payload, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    2));
    console.log(`✓ exported to ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
