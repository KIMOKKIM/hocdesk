#!/usr/bin/env npx tsx
/**
 * Turso 최소 운영 seed (데모 제외 기본)
 * npx tsx scripts/seed-turso.ts
 * npx tsx scripts/seed-turso.ts --apply
 * npx tsx scripts/seed-turso.ts --apply --include-demo
 */
import "dotenv/config";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";
import { seedOperationalProject } from "../lib/seed/operational-seed";

const apply = process.argv.includes("--apply");
const includeDemo = process.argv.includes("--include-demo");

function requireTursoEnv() {
  if (!process.env.TURSO_DATABASE_URL?.trim() || !process.env.TURSO_AUTH_TOKEN?.trim()) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.");
    process.exit(1);
  }
}

async function main() {
  requireTursoEnv();

  console.log(`Turso seed (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log(`- 진웅산업 양주 공장 매각 프로젝트`);
  console.log(`- AppSetting 기본값`);
  console.log(`- 데모 업체: ${includeDemo ? "포함" : "제외"}`);

  if (!apply) {
    console.log("적용하려면 --apply 옵션을 사용하세요.");
    return;
  }

  const prisma = createTursoPrismaClient();
  try {
    await seedOperationalProject(prisma);
    if (includeDemo) {
      console.log("데모 seed는 prisma/seed.ts 전체 실행으로 별도 처리하세요.");
    }
    console.log("✓ Turso operational seed 완료");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
