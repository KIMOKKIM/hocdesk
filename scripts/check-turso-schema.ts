#!/usr/bin/env npx tsx
/**
 * Turso schema/table 점검
 * npx tsx scripts/check-turso-schema.ts
 */
import "dotenv/config";
import { TURSO_SCHEMA_TABLES } from "../lib/db/turso-tables";
import { hasTursoEnv, printTursoEnvStatus, requireTursoEnv } from "../lib/db/turso-env";
import { checkTursoReadiness } from "../lib/turso/check-readiness";

async function main() {
  printTursoEnvStatus();

  if (!hasTursoEnv()) {
    console.log("SKIP: Turso 환경변수 없음");
    process.exit(0);
  }

  requireTursoEnv();

  const readiness = await checkTursoReadiness();

  console.log("\n=== Turso schema check ===");
  for (const { key, table } of TURSO_SCHEMA_TABLES) {
    const ok = readiness.tableChecks[key];
    console.log(`${ok ? "✓" : "✗"} ${table} (${key})`);
  }

  console.log("\n=== Readiness summary ===");
  console.log(`database: ${readiness.database}`);
  console.log(`schemaReady: ${readiness.schemaReady}`);
  console.log(`seedReady: ${readiness.seedReady}`);
  console.log(`jinwoongProject: ${readiness.checks.jinwoongProject}`);

  if (readiness.setupStep) {
    console.log(`setupStep: ${readiness.setupStep}`);
  }

  if (!readiness.schemaReady) {
    console.log("\n다음: npm run turso:schema:apply");
    process.exit(1);
  }

  if (!readiness.seedReady) {
    console.log("\n다음: npm run turso:seed:apply");
    process.exit(1);
  }

  console.log("\n✓ Turso schema/seed 준비 완료");
}

main().catch((error) => {
  console.error("check-turso-schema failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
