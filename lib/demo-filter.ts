/**
 * 데모/실제 데이터 표시 기본값
 * - production / Vercel: 쿼리 includeDemo=true 가 아니면 항상 제외
 * - development: INCLUDE_DEMO_DATA 기본 true (토글로 변경 가능)
 */
import { isProductionEnvironment } from "@/lib/db/database-provider";

function isOpsEnvironment(): boolean {
  return (
    isProductionEnvironment() || process.env.NODE_ENV === "production"
  );
}

/**
 * 운영 화면·API 공통: 데모 포함 여부.
 * 운영에서는 URL/?includeDemo=true 로만 예외 허용.
 */
export function shouldIncludeDemo(param?: string | null): boolean {
  if (isOpsEnvironment()) {
    return param === "true";
  }
  return resolveIncludeDemo(param);
}

export function resolveIncludeDemo(param?: string | null): boolean {
  if (param === "true") return true;
  if (param === "false") return false;

  const envDefault = process.env.INCLUDE_DEMO_DATA?.trim().toLowerCase();
  if (envDefault === "true") {
    if (isOpsEnvironment()) return false;
    return true;
  }
  if (envDefault === "false") return false;

  if (isOpsEnvironment()) return false;

  return true;
}

/** Prisma where: 데모 업체 제외 (Company 기준) */
export function demoCompanyExcludeWhere() {
  return {
    NOT: {
      OR: [
        { companyName: { contains: "데모" } },
        {
          sources: {
            some: {
              OR: [
                { sourceType: "DEMO_SEARCH" },
                { sourceType: "MANUAL_DEMO" },
                { sourceType: "DEMO" },
                { provider: "demo" },
                { sourceUrl: { contains: "demo" } },
              ],
            },
          },
        },
        { generalEmail: { contains: "demo" } },
        { website: { contains: "demo" } },
        { websiteDomain: { contains: "demo" } },
        { websiteDomain: { contains: "example.com" } },
      ],
    },
  };
}

/** 메모리 후처리용 — Prisma 필터 누락/Turso 이슈 방어 */
export function isDemoCompanyName(companyName: string | null | undefined): boolean {
  return Boolean(companyName?.includes("데모"));
}

export function filterOutDemoProjectCompanies<
  T extends { company: { companyName: string } },
>(items: T[]): T[] {
  return items.filter((item) => !isDemoCompanyName(item.company.companyName));
}

export function isAllowDemoProviderInProduction(): boolean {
  return (
    process.env.ALLOW_DEMO_PROVIDER_IN_PRODUCTION?.trim().toLowerCase() ===
    "true"
  );
}

export function assertDemoProviderAllowed(): void {
  if (process.env.NODE_ENV !== "production" && !isProductionEnvironment()) {
    return;
  }
  if (isAllowDemoProviderInProduction()) return;
  throw new Error(
    "운영환경에서는 데모 검색을 사용할 수 없습니다. Kakao 실제 업체 검색을 사용하세요.",
  );
}
