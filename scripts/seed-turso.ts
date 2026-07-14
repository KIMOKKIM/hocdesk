#!/usr/bin/env npx tsx
/**
 * Turso 최소 운영 seed (데모 제외 기본)
 * npm run turso:seed
 * npm run turso:seed:apply
 * npm run turso:seed:apply -- --include-demo
 */
import "dotenv/config";
import { printTursoEnvStatus, requireTursoEnv } from "../lib/db/turso-env";
import { seedTursoProduction } from "../lib/turso/seed-production";

const apply = process.argv.includes("--apply");
const includeDemo = process.argv.includes("--include-demo");

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

  if (includeDemo) {
    console.log("데모 업체 seed는 prisma/seed.ts 전체 실행으로 별도 처리하세요.");
  }

  const result = await seedTursoProduction();
  console.log("\n=== Seed counts ===");
  console.log(`Project: ${result.counts.projects}`);
  console.log(`AppSetting: ${result.counts.appSettings}`);
  console.log(`Company: ${result.counts.companies}`);
  console.log("\n✓ Turso operational seed 완료 — 진웅산업 프로젝트 준비됨");
}

main().catch((error) => {
  console.error("seed-turso failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
