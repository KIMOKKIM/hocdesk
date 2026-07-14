#!/usr/bin/env npx tsx
/**
 * Turso schema push (dry-run 기본)
 * npm run turso:schema
 * npm run turso:schema:apply
 */
import "dotenv/config";
import { printTursoEnvStatus, requireTursoEnv } from "../lib/db/turso-env";
import { applyTursoSchema } from "../lib/turso/setup-schema";

const apply = process.argv.includes("--apply");

async function main() {
  printTursoEnvStatus();
  requireTursoEnv();

  console.log(`\nTurso schema push (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log("기존 테이블은 삭제하지 않습니다 (CREATE IF NOT EXISTS).");

  if (!apply) {
    console.log("\n실행 예정: lib/turso/setup-schema applyTursoSchema()");
    console.log("적용하려면: npm run turso:schema:apply");
    return;
  }

  process.env.DATABASE_PROVIDER = "turso";
  const result = await applyTursoSchema();
  console.log(`\n✓ schema 적용 완료 (${result.statementCount} statements)`);
  console.log("다음: npm run turso:check");
}

main().catch((error) => {
  console.error(
    "push-schema-to-turso failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
