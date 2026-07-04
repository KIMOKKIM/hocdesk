/**
 * Legacy outreach status → approvalStatus/status 분리 마이그레이션
 * 실행: npx tsx scripts/migrate-outreach-status.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const legacyPending = await prisma.outreach.updateMany({
    where: { status: "PENDING" },
    data: { approvalStatus: "PENDING", status: "DRAFT" },
  });

  const legacyApproved = await prisma.outreach.updateMany({
    where: { status: "APPROVED", sentAt: null },
    data: { approvalStatus: "APPROVED", status: "DRAFT" },
  });

  const legacyRejected = await prisma.outreach.updateMany({
    where: { status: "REJECTED" },
    data: { approvalStatus: "REJECTED", status: "DRAFT" },
  });

  console.log("Migrated:", {
    pending: legacyPending.count,
    approved: legacyApproved.count,
    rejected: legacyRejected.count,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
