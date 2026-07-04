#!/usr/bin/env npx tsx
/**
 * CompanySource 중복 정리 (기본 dry-run)
 * npx tsx scripts/cleanup-company-sources.ts
 * npx tsx scripts/cleanup-company-sources.ts --apply
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const apply = process.argv.includes("--apply");
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

type SourceRow = {
  id: string;
  companyId: string;
  provider: string | null;
  externalId: string | null;
  sourceUrl: string | null;
  searchKeyword: string | null;
  collectedAt: Date;
  rawMetadata: unknown;
};

function scoreCompleteness(row: SourceRow) {
  let score = 0;
  if (row.provider) score += 1;
  if (row.externalId) score += 2;
  if (row.sourceUrl) score += 1;
  if (row.searchKeyword) score += 1;
  if (row.rawMetadata) score += 1;
  return score;
}

function pickKeeper(rows: SourceRow[]) {
  return rows.sort((a, b) => {
    const scoreDiff = scoreCompleteness(b) - scoreCompleteness(a);
    if (scoreDiff !== 0) return scoreDiff;
    return b.collectedAt.getTime() - a.collectedAt.getTime();
  })[0]!;
}

async function main() {
  const sources = await prisma.companySource.findMany({
    orderBy: { collectedAt: "desc" },
  });

  const groups = new Map<string, SourceRow[]>();

  for (const source of sources) {
    const keys: string[] = [];
    if (source.provider && source.externalId) {
      keys.push(`pe:${source.companyId}:${source.provider}:${source.externalId}`);
    }
    if (source.sourceUrl && source.searchKeyword) {
      keys.push(`usk:${source.companyId}:${source.sourceUrl}:${source.searchKeyword}`);
    }
    if (source.provider && source.sourceUrl) {
      keys.push(`psu:${source.companyId}:${source.provider}:${source.sourceUrl}`);
    }

    for (const key of keys) {
      const list = groups.get(key) ?? [];
      list.push(source);
      groups.set(key, list);
    }
  }

  const deleteIds = new Set<string>();
  let duplicateGroups = 0;

  for (const [, rows] of groups) {
    if (rows.length <= 1) continue;
    duplicateGroups += 1;
    const keeper = pickKeeper(rows);
    for (const row of rows) {
      if (row.id !== keeper.id) deleteIds.add(row.id);
    }
  }

  console.log(`중복 그룹: ${duplicateGroups}`);
  console.log(`삭제 예정: ${deleteIds.size}건`);
  console.log(`모드: ${apply ? "APPLY" : "DRY-RUN"}`);

  if (apply && deleteIds.size > 0) {
    const result = await prisma.companySource.deleteMany({
      where: { id: { in: Array.from(deleteIds) } },
    });
    console.log(`삭제 완료: ${result.count}건`);
  }

  if (!apply) {
    console.log("적용하려면 --apply 옵션을 사용하세요.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
