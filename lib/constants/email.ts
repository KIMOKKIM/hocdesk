export const OutreachEmailType = {
  INITIAL: "INITIAL",
  FOLLOW_UP: "FOLLOW_UP",
} as const;

export const EMAIL_DISCLAIMER =
  "본 메일은 수신을 원치 않으시면 회신 또는 담당자에게 수신거부 의사를 알려주시기 바랍니다.";

export const EXTERNAL_PROJECT_EXPRESSION =
  "소유자의 사업 재편에 따라 산업용 부동산 매각을 검토하고 있습니다.";

export type IndustryTemplateKey =
  | "scrap_auto"
  | "truck_repair"
  | "used_truck_export"
  | "recycling"
  | "logistics"
  | "construction_material"
  | "industrial_dev"
  | "factory_broker"
  | "general_manufacturing"
  | "general_industrial";

export const INDUSTRY_TEMPLATE_LABELS: Record<IndustryTemplateKey, string> = {
  scrap_auto: "폐차·자동차해체재활용",
  truck_repair: "대형차·건설기계 정비",
  used_truck_export: "중고 상용차 매매·수출",
  recycling: "자원순환·재활용",
  logistics: "물류·창고",
  construction_material: "건설자재·중장비",
  industrial_dev: "산업용 부동산 개발사",
  factory_broker: "공장·창고 전문 중개업",
  general_manufacturing: "일반 제조업 확장이전",
  general_industrial: "기타 산업용 부지 수요",
};

export function resolveIndustryTemplate(
  industryGroup?: string | null,
  detailedIndustry?: string | null,
): IndustryTemplateKey {
  const text = `${industryGroup ?? ""} ${detailedIndustry ?? ""}`;

  if (/폐차|해체|자동차/.test(text)) return "scrap_auto";
  if (/상용차|수출|중고차/.test(text)) return "used_truck_export";
  if (/정비|건설기계|중장비/.test(text)) return "truck_repair";
  if (/재활용|자원순환|환경/.test(text)) return "recycling";
  if (/물류|창고|3PL/.test(text)) return "logistics";
  if (/건축|자재/.test(text)) return "construction_material";
  if (/부동산|개발|산업단지/.test(text)) return "industrial_dev";
  if (/중개|브로커/.test(text)) return "factory_broker";
  if (/제조|공장/.test(text)) return "general_manufacturing";
  return "general_industrial";
}
