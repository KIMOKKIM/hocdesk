#!/usr/bin/env npx tsx
/**
 * Turso schema push (dry-run 기본)
 * npx tsx scripts/push-schema-to-turso.ts
 * npx tsx scripts/push-schema-to-turso.ts --apply
 */
import { spawnSync } from "node:child_process";

const apply = process.argv.includes("--apply");

function requireTursoEnv() {
  if (!process.env.TURSO_DATABASE_URL?.trim() || !process.env.TURSO_AUTH_TOKEN?.trim()) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.");
    process.exit(1);
  }
}

function main() {
  requireTursoEnv();
  console.log(`Turso schema push (${apply ? "APPLY" : "DRY-RUN"})`);

  if (!apply) {
    console.log("실행 예정: DATABASE_PROVIDER=turso prisma db push");
    console.log("적용하려면 --apply 옵션을 사용하세요.");
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

  process.exit(result.status ?? 1);
}

main();
