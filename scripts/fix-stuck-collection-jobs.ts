#!/usr/bin/env npx tsx
/**
 * RUNNING 고착 수집 작업 정리 (dry-run 기본)
 * npm run jobs:fix-stuck
 * npm run jobs:fix-stuck:apply
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";
import { resolveDatabaseProvider } from "../lib/db/database-provider";

const apply = process.argv.includes("--apply");
const STALE_MS = 10 * 60 * 1000;

function createClient(): PrismaClient {
  const provider = (() => {
    try {
      return resolveDatabaseProvider();
    } catch {
      return "sqlite";
    }
  })();

  if (provider === "turso") {
    process.env.DATABASE_PROVIDER = "turso";
    return createTursoPrismaClient();
  }

  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}

async function main() {
  const prisma = createClient();
  let provider = "sqlite";
  try {
    provider = resolveDatabaseProvider();
  } catch {
    provider = process.env.DATABASE_PROVIDER ?? "sqlite";
  }

  console.log(`\n=== Fix stuck collection jobs (${apply ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`DATABASE_PROVIDER: ${provider}`);
  console.log(`기준: lastProgressAt 또는 startedAt이 ${STALE_MS / 60000}분 이상 지난 RUNNING/QUEUED\n`);

  try {
    const now = Date.now();
    const jobs = await prisma.targetCollectionJob.findMany({
      where: {
        status: { in: ["RUNNING", "QUEUED", "CANCEL_REQUESTED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const stuck = jobs.filter((job) => {
      const ref = job.lastProgressAt ?? job.startedAt ?? job.createdAt;
      return now - ref.getTime() >= STALE_MS;
    });

    console.log(`활성 작업: ${jobs.length}`);
    console.log(`고착 후보: ${stuck.length}`);
    for (const job of stuck.slice(0, 20)) {
      const ref = job.lastProgressAt ?? job.startedAt ?? job.createdAt;
      const ageMin = Math.round((now - ref.getTime()) / 60000);
      console.log(
        `- ${job.id} · ${job.status} · ${ageMin}분 전 · project=${job.projectId}`,
      );
    }

    if (!apply) {
      console.log("\nDRY-RUN 완료. 적용: npm run jobs:fix-stuck:apply");
      return;
    }

    if (stuck.length === 0) {
      console.log("\n정리할 작업이 없습니다.");
      return;
    }

    const result = await prisma.targetCollectionJob.updateMany({
      where: { id: { in: stuck.map((j) => j.id) } },
      data: {
        status: "FAILED",
        currentStep: "실패",
        completedAt: new Date(),
        errorMessage: "이전 수집 방식의 장시간 작업이 정리되었습니다.",
        lastMessage: "이전 수집 방식의 장시간 작업이 정리되었습니다.",
        lastProgressAt: new Date(),
      },
    });

    console.log(`\nAPPLY 완료: ${result.count}건 FAILED 처리`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
