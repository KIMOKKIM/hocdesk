/**
 * 데모/실제 데이터 표시 기본값
 * - production: INCLUDE_DEMO_DATA 기본 false
 * - development: INCLUDE_DEMO_DATA 기본 true (토글로 변경 가능)
 */
export function resolveIncludeDemo(param?: string | null): boolean {
  if (param === "true") return true;
  if (param === "false") return false;

  const envDefault = process.env.INCLUDE_DEMO_DATA?.trim().toLowerCase();
  if (envDefault === "true") return true;
  if (envDefault === "false") return false;

  return process.env.NODE_ENV !== "production";
}

/** Prisma where: 데모 업체 제외 */
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

export function isAllowDemoProviderInProduction(): boolean {
  return (
    process.env.ALLOW_DEMO_PROVIDER_IN_PRODUCTION?.trim().toLowerCase() ===
    "true"
  );
}

export function assertDemoProviderAllowed(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (isAllowDemoProviderInProduction()) return;
  throw new Error(
    "운영환경에서는 데모 검색을 사용할 수 없습니다. Kakao 실제 업체 검색을 사용하세요.",
  );
}
