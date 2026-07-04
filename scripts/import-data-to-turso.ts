#!/usr/bin/env npx tsx
/**
 * SQLite export JSON -> Turso upsert (dry-run 기본)
 * npx tsx scripts/import-data-to-turso.ts --file backup/sqlite-export.json
 * npx tsx scripts/import-data-to-turso.ts --file backup/sqlite-export.json --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";

const apply = process.argv.includes("--apply");
const fileIndex = process.argv.indexOf("--file");
const filePath = fileIndex >= 0 ? process.argv[fileIndex + 1] : null;

function requireTursoEnv() {
  if (!process.env.TURSO_DATABASE_URL?.trim() || !process.env.TURSO_AUTH_TOKEN?.trim()) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.");
    process.exit(1);
  }
}

async function main() {
  requireTursoEnv();
  if (!filePath) {
    console.error("--file <export.json> 옵션이 필요합니다.");
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(filePath, "utf8")) as {
    projects?: Array<{ id: string; name: string }>;
    companies?: Array<{ id: string; companyName: string }>;
  };

  console.log(`Import to Turso (${apply ? "APPLY" : "DRY-RUN"})`);
  console.log(`- projects: ${payload.projects?.length ?? 0}`);
  console.log(`- companies: ${payload.companies?.length ?? 0}`);

  if (!apply) {
    console.log("적용하려면 --apply 옵션을 사용하세요.");
    return;
  }

  const prisma = createTursoPrismaClient();
  try {
    let projectUpserts = 0;
    for (const project of payload.projects ?? []) {
      await prisma.project.upsert({
        where: { id: project.id },
        update: project as never,
        create: project as never,
      });
      projectUpserts += 1;
    }
    console.log(`✓ project upsert ${projectUpserts}건`);
  } catch (error) {
    console.error("Import failed at project upsert:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
