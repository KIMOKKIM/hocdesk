/**
 * 데모/실제 데이터 표시 기본값
 * - INCLUDE_DEMO_DATA=false (운영 기본)
 * - INCLUDE_DEMO_DATA=true (로컬 기본)
 */
export function resolveIncludeDemo(param?: string | null): boolean {
  if (param === "true") return true;
  if (param === "false") return false;

  const envDefault = process.env.INCLUDE_DEMO_DATA?.trim().toLowerCase();
  if (envDefault === "true") return true;
  if (envDefault === "false") return false;

  return process.env.NODE_ENV !== "production";
}

export function demoCompanyExcludeWhere() {
  return {
    NOT: {
      OR: [
        { companyName: { contains: "데모" } },
        { sources: { some: { sourceType: "DEMO_SEARCH" } } },
      ],
    },
  };
}
