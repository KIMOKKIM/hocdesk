#!/usr/bin/env npx tsx
/**
 * 데모 데이터 정리 (dry-run 기본)
 * npm run cleanup:demo
 * npm run cleanup:demo:apply
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { createTursoPrismaClient } from "../lib/db/create-turso-client";
import { resolveDatabaseProvider } from "../lib/db/database-provider";
import { OPERATIONAL_PROJECT_ID } from "../lib/seed/operational-seed";

const apply = process.argv.includes("--apply");

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

function isDemoName(name: string) {
  return name.includes("데모");
}

function looksDemoEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().includes("demo"));
}

function looksDemoWebsite(website?: string | null, domain?: string | null) {
  const w = website?.toLowerCase() ?? "";
  const d = domain?.toLowerCase() ?? "";
  return (
    w.includes("demo") ||
    d.includes("demo") ||
    d.includes("example.com") ||
    w.includes("example.com")
  );
}

async function main() {
  const prisma = createClient();
  let provider = "sqlite";
  try {
    provider = resolveDatabaseProvider();
  } catch {
    provider = process.env.DATABASE_PROVIDER ?? "sqlite";
  }

  console.log(`\n=== Demo cleanup (${apply ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`DATABASE_PROVIDER: ${provider}`);
  console.log(`진웅산업 Project(${OPERATIONAL_PROJECT_ID})는 삭제하지 않습니다.\n`);

  try {
    const companies = await prisma.company.findMany({
      include: { sources: true },
    });

    const demoCompanies = companies.filter((c) => {
      if (isDemoName(c.companyName)) return true;
      if (looksDemoEmail(c.generalEmail)) return true;
      if (looksDemoWebsite(c.website, c.websiteDomain)) return true;
      return c.sources.some(
        (s) =>
          s.sourceType === "DEMO_SEARCH" ||
          s.sourceType === "MANUAL_DEMO" ||
          s.sourceType === "DEMO" ||
          s.provider === "demo" ||
          (s.rawMetadata &&
            typeof s.rawMetadata === "object" &&
            (s.rawMetadata as { isDemo?: boolean }).isDemo === true),
      );
    });

    const demoCompanyIds = demoCompanies.map((c) => c.id);

    const projectCompanies = demoCompanyIds.length
      ? await prisma.projectCompany.findMany({
          where: { companyId: { in: demoCompanyIds } },
        })
      : [];

    const contacts = demoCompanyIds.length
      ? await prisma.contact.findMany({
          where: {
            OR: [
              { companyId: { in: demoCompanyIds } },
              { email: { contains: "demo" } },
            ],
          },
        })
      : await prisma.contact.findMany({
          where: { email: { contains: "demo" } },
        });

    const outreachs = demoCompanyIds.length
      ? await prisma.outreach.findMany({
          where: { companyId: { in: demoCompanyIds } },
        })
      : [];

    const sources = demoCompanyIds.length
      ? await prisma.companySource.findMany({
          where: {
            OR: [
              { companyId: { in: demoCompanyIds } },
              { sourceType: { in: ["DEMO_SEARCH", "MANUAL_DEMO", "DEMO"] } },
              { provider: "demo" },
            ],
          },
        })
      : await prisma.companySource.findMany({
          where: {
            OR: [
              { sourceType: { in: ["DEMO_SEARCH", "MANUAL_DEMO", "DEMO"] } },
              { provider: "demo" },
            ],
          },
        });

    const candidates = await prisma.discoveredCandidate.findMany({
      where: {
        OR: [
          { provider: "demo" },
          { companyName: { contains: "데모" } },
        ],
      },
    });

    const jobs = await prisma.targetCollectionJob.findMany();
    const demoJobs = jobs.filter((job) => {
      const plan = job.searchPlan as { provider?: string } | null;
      if (plan?.provider === "demo") return true;
      if (job.jobType?.toUpperCase().includes("DEMO")) return true;
      return false;
    });

    const activityLogs =
      demoCompanyIds.length > 0
        ? await prisma.activityLog.findMany({
            where: {
              OR: [
                { companyId: { in: demoCompanyIds } },
                { summary: { contains: "데모" } },
              ],
            },
          })
        : await prisma.activityLog.findMany({
            where: { summary: { contains: "데모" } },
          });

    console.log("=== 삭제 예정 요약 ===");
    console.log(`Company: ${demoCompanies.length}`);
    console.log(`ProjectCompany: ${projectCompanies.length}`);
    console.log(`Contact: ${contacts.length}`);
    console.log(`Outreach: ${outreachs.length}`);
    console.log(`CompanySource: ${sources.length}`);
    console.log(`DiscoveredCandidate: ${candidates.length}`);
    console.log(`TargetCollectionJob: ${demoJobs.length}`);
    console.log(`ActivityLog: ${activityLogs.length}`);

    console.log("\n=== 데모 Company 샘플 (최대 10) ===");
    for (const c of demoCompanies.slice(0, 10)) {
      console.log(`- ${c.companyName} (${c.id})`);
    }
    if (demoCompanies.length === 0) {
      console.log("(없음)");
    }

    if (!apply) {
      console.log("\nDRY-RUN 완료. 실제 삭제는: npm run cleanup:demo:apply");
      return;
    }

    console.log("\nAPPLY 시작...");

    const step = async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        console.log(`✓ ${label}`);
      } catch (error) {
        console.error(
          `✗ ${label} 실패:`,
          error instanceof Error ? error.message : error,
        );
        throw error;
      }
    };

    await step("Outreach", () =>
      prisma.outreach.deleteMany({
        where: { id: { in: outreachs.map((o) => o.id) } },
      }),
    );
    await step("Contact", () =>
      prisma.contact.deleteMany({
        where: { id: { in: contacts.map((c) => c.id) } },
      }),
    );
    await step("ProjectCompany", () =>
      prisma.projectCompany.deleteMany({
        where: { id: { in: projectCompanies.map((p) => p.id) } },
      }),
    );
    await step("CompanySource", () =>
      prisma.companySource.deleteMany({
        where: { id: { in: sources.map((s) => s.id) } },
      }),
    );
    await step("DiscoveredCandidate", () =>
      prisma.discoveredCandidate.deleteMany({
        where: { id: { in: candidates.map((c) => c.id) } },
      }),
    );
    await step("TargetCollectionJob", () =>
      prisma.targetCollectionJob.deleteMany({
        where: { id: { in: demoJobs.map((j) => j.id) } },
      }),
    );
    await step("ActivityLog", () =>
      prisma.activityLog.deleteMany({
        where: { id: { in: activityLogs.map((a) => a.id) } },
      }),
    );
    await step("Company", () =>
      prisma.company.deleteMany({
        where: { id: { in: demoCompanyIds } },
      }),
    );

    console.log("\n✓ 데모 데이터 정리 완료");
    console.log(
      `남은 Project: ${await prisma.project.count()} (진웅산업 프로젝트 유지)`,
    );
    console.log(`남은 Company: ${await prisma.company.count()}`);

    const remainingDemo = await prisma.company.findMany({
      where: { companyName: { contains: "데모" } },
      select: { id: true, companyName: true },
      take: 20,
    });
    console.log(`남은 데모 Company(이름 기준): ${remainingDemo.length}`);
    for (const c of remainingDemo) {
      console.log(`- ${c.companyName} (${c.id})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("cleanup-demo-data failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
