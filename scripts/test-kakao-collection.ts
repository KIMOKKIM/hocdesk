/**
 * Phase 5 Kakao / Demo collection tests
 * 실행: npx tsx scripts/test-kakao-collection.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import { runInitialCollection } from "../lib/collection/collection-service";
import { isKakaoApiConfigured } from "../lib/collection/providers/kakao-local-client";
import { getTargetSearchProvider } from "../lib/collection/providers";
import { ReviewStatus, CompanyStatus } from "../lib/constants/status";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function testMissingApiKey() {
  console.log("\n=== A. API 키 없음 ===");
  const originalProvider = process.env.TARGET_SEARCH_PROVIDER;
  const originalKey = process.env.KAKAO_REST_API_KEY;
  process.env.TARGET_SEARCH_PROVIDER = "kakao";
  delete process.env.KAKAO_REST_API_KEY;

  try {
    getTargetSearchProvider("kakao");
    throw new Error("API 키 없음 오류 미발생");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("KAKAO_REST_API_KEY")) {
      throw error;
    }
    console.log("✓ 명확한 설정 오류:", message.slice(0, 60) + "...");
  } finally {
    process.env.TARGET_SEARCH_PROVIDER = originalProvider;
    if (originalKey) process.env.KAKAO_REST_API_KEY = originalKey;
  }
}

async function testDemoRegression() {
  console.log("\n=== B. Demo Provider 회귀 ===");
  const project = await prisma.project.findFirst({ where: { status: "ACTIVE" } });
  if (!project) throw new Error("프로젝트 없음");

  const beforeCount = await prisma.company.count();
  const result = await runInitialCollection({
    projectId: project.id,
    force: true,
    confirmed: true,
    requestedCount: 5,
    provider: "demo",
  });

  if (result.status !== "COMPLETED") {
    throw new Error(`Demo 수집 실패: ${result.errorMessage}`);
  }

  const demoCompany = await prisma.company.findFirst({
    where: {
      companyName: { contains: "데모" },
      sources: { some: { sourceType: "DEMO_SEARCH" } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!demoCompany) throw new Error("데모 업체 미생성");
  const link = await prisma.projectCompany.findFirst({
    where: { companyId: demoCompany.id, projectId: project.id },
  });
  if (link?.reviewStatus !== ReviewStatus.PENDING) {
    throw new Error("Demo 업체가 PENDING이 아님");
  }
  if (demoCompany.status !== CompanyStatus.NEW) {
    throw new Error("Demo 업체 status가 NEW가 아님");
  }

  console.log(
    `✓ Demo 수집 완료 · 신규 ${result.acceptedCount} · 전체 업체 ${beforeCount}→${await prisma.company.count()}`,
  );
}

async function testKakaoIntegration() {
  console.log("\n=== C. Kakao Provider 통합 ===");
  if (!isKakaoApiConfigured()) {
    console.log("SKIP: KAKAO_REST_API_KEY 없음 — 구현 완료, 실제 호출 미검증");
    return;
  }

  process.env.TARGET_SEARCH_PROVIDER = "kakao";
  const project = await prisma.project.findFirst({ where: { status: "ACTIVE" } });
  if (!project) throw new Error("프로젝트 없음");

  const result = await runInitialCollection({
    projectId: project.id,
    force: true,
    confirmed: true,
    requestedCount: 10,
    provider: "kakao",
  });

  if (result.status !== "COMPLETED") {
    throw new Error(`Kakao 수집 실패: ${result.errorMessage}`);
  }

  const kakaoSource = await prisma.companySource.findFirst({
    where: { sourceType: "KAKAO_LOCAL" },
    orderBy: { collectedAt: "desc" },
    include: { company: true },
  });

  if (!kakaoSource) throw new Error("KAKAO_LOCAL 출처 없음");
  if (kakaoSource.company.companyName.includes("데모")) {
    throw new Error("실제 업체명에 데모 포함");
  }
  if (kakaoSource.externalId == null) throw new Error("externalId 미저장");
  if (!kakaoSource.sourceUrl) throw new Error("place_url 미저장");
  if (kakaoSource.company.generalEmail) {
    throw new Error("임의 이메일 생성됨");
  }

  const link = await prisma.projectCompany.findFirst({
    where: { companyId: kakaoSource.companyId, projectId: project.id },
  });
  if (link?.reviewStatus === ReviewStatus.CONTACT_READY) {
    throw new Error("자동 CONTACT_READY 금지 위반");
  }

  console.log("✓ Kakao 실제 호출 검증");
  console.log(`  업체: ${kakaoSource.company.companyName}`);
  console.log(`  신규 ${result.acceptedCount} · 중복 ${result.duplicateCount}`);
  console.log(`  jobStats:`, result.jobStats);
}

async function main() {
  await testMissingApiKey();
  await testDemoRegression();
  await testKakaoIntegration();
  console.log("\n=== Phase 5 검증 통과 ===");
}

main()
  .catch((error) => {
    console.error("\n검증 실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
