#!/usr/bin/env npx tsx
/**
 * Turso schema push (dry-run 기본)
 * npm run turso:schema
 * npm run turso:schema:apply
 */
import { spawnSync } from "node:child_process";
import "dotenv/config";
import { printTursoEnvStatus, requireTursoEnv } from "../lib/db/turso-env";

const apply = process.argv.includes("--apply");

function main() {
  printTursoEnvStatus();
  requireTursoEnv();

  console.log(`\nTurso schema push (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log("기존 테이블은 삭제하지 않습니다 (prisma db push).");

  if (!apply) {
    console.log("\n실행 예정: DATABASE_PROVIDER=turso npx prisma db push");
    console.log("적용하려면: npm run turso:schema:apply");
    return;
  }

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "push"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_PROVIDER: "turso",
      },
    },
  );

  if ((result.status ?? 1) !== 0) {
    console.error("\n✗ schema push 실패 — 위 Prisma 오류 메시지에서 테이블/필드를 확인하세요.");
    process.exit(result.status ?? 1);
  }

  console.log("\n✓ schema push 완료 — npm run turso:check 로 확인하세요.");
}

main();
