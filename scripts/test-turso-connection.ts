#!/usr/bin/env npx tsx
/**
 * Turso 연결 테스트
 * npx tsx scripts/test-turso-connection.ts
 */
import "dotenv/config";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";

const TEST_ID = `turso_test_${Date.now()}`;

async function main() {
  if (!process.env.TURSO_DATABASE_URL?.trim() || !process.env.TURSO_AUTH_TOKEN?.trim()) {
    console.log("SKIP: TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 없음 — Turso 실연결 미검증");
    return;
  }

  const prisma = createTursoPrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ 연결 성공");

    const projectCount = await prisma.project.count();
    console.log(`✓ project count: ${projectCount}`);

    await prisma.$transaction(async (tx) => {
      await tx.appSetting.upsert({
        where: { key: TEST_ID },
        update: { value: { ok: true, at: new Date().toISOString() } },
        create: { key: TEST_ID, value: { ok: true } },
      });
    });
    console.log("✓ transaction + Json upsert");

    await prisma.appSetting.delete({ where: { key: TEST_ID } }).catch(() => undefined);
    console.log("✓ test record cleaned");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Turso test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
