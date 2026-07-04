import type { SearchCandidate } from "@/lib/collection/types";

const ASKING_PRICE = 5_300_000_000;

const NORTH_GYEONGGI = [
  "양주",
  "의정부",
  "포천",
  "동두천",
  "남양주",
  "파주",
  "김포",
  "인천",
];

const HIGH_FIT_INDUSTRIES = [
  "자동차해체",
  "폐차",
  "대형차",
  "상용차",
  "건설기계",
  "중고차",
  "중고 상용차",
  "고철",
  "비철",
  "재활용",
  "폐기물",
  "물류",
  "건축자재",
  "중장비",
  "부동산",
  "중개",
  "창고",
];

const YARD_HEAVY_INDUSTRIES = [
  "폐차",
  "상용차",
  "건설기계",
  "중장비",
  "물류",
  "고철",
  "건축자재",
  "중고차",
];

export type TargetFitInput = {
  candidate: SearchCandidate;
  projectLocation?: string | null;
  askingPrice?: bigint | number | null;
};

export type TargetFitResult = {
  fitScore: number;
  targetGrade: string;
  financialScore: number;
  locationScore: number;
  facilityNeedScore: number;
  expansionSignalScore: number;
  decisionMakerScore: number;
  recommendedUse: string;
  targetingReason: string;
  riskFactors: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function includesAny(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function scoreIndustry(candidate: SearchCandidate) {
  const text = [
    candidate.industryGroup,
    candidate.detailedIndustry,
    candidate.searchKeyword,
    candidate.currentFacilityType,
  ]
    .filter(Boolean)
    .join(" ");

  if (includesAny(text, HIGH_FIT_INDUSTRIES)) return 22;
  if (includesAny(text, ["정비", "임대", "개발"])) return 16;
  return 8;
}

function scoreLocation(region?: string | null) {
  if (!region) return 5;
  if (region.includes("양주")) return 15;
  if (NORTH_GYEONGGI.some((city) => region.includes(city))) return 12;
  return 6;
}

function scoreFacilityNeed(candidate: SearchCandidate) {
  const text = [
    candidate.detailedIndustry,
    candidate.currentFacilityType,
    candidate.recommendedUse,
  ]
    .filter(Boolean)
    .join(" ");

  if (includesAny(text, YARD_HEAVY_INDUSTRIES)) return 14;
  if (includesAny(text, ["창고", "물류", "야적", "부지"])) return 11;
  return 6;
}

function scoreExpansion(candidate: SearchCandidate) {
  const employees = candidate.employeeCount ?? 0;
  if (employees >= 40) return 14;
  if (employees >= 20) return 11;
  if (employees >= 10) return 8;
  return 5;
}

function scoreFinancial(candidate: SearchCandidate) {
  const revenueText = candidate.estimatedRevenue ?? "";
  const match = revenueText.match(/(\d+)/);
  const revenue = match ? Number(match[1]) : 0;

  if (revenue >= 80) return 15;
  if (revenue >= 50) return 12;
  if (revenue >= 30) return 9;
  if (revenue >= 15) return 6;
  return 4;
}

function scorePermit(candidate: SearchCandidate) {
  const text = [candidate.detailedIndustry, candidate.riskFactors].filter(Boolean).join(" ");
  if (includesAny(text, ["환경", "인허가", "토양", "주민"])) return 5;
  if (includesAny(text, ["재활용", "폐기물"])) return 7;
  return 9;
}

function scoreContact(candidate: SearchCandidate) {
  let score = 0;
  if (candidate.mainPhone) score += 2;
  if (candidate.generalEmail) score += 2;
  if (candidate.representativeName) score += 1;
  return score;
}

function gradeFromScore(fitScore: number) {
  if (fitScore >= 75) return "A";
  if (fitScore >= 60) return "B";
  if (fitScore >= 40) return "C";
  return "EXCLUDED";
}

function buildRecommendedUse(candidate: SearchCandidate) {
  if (candidate.recommendedUse) return candidate.recommendedUse;
  return `${candidate.detailedIndustry ?? "산업"} 관련 대형 부지·시설 활용`;
}

function buildTargetingReason(candidate: SearchCandidate, projectLocation?: string | null) {
  const region = candidate.region ?? projectLocation ?? "경기 북부";
  return `${region} 일대 ${candidate.detailedIndustry ?? candidate.searchKeyword} 업종의 넓은 부지 수요와 진웅산업 매각 부지 규모가 부합합니다.`;
}

function buildRiskFactors(candidate: SearchCandidate) {
  if (candidate.riskFactors) return candidate.riskFactors;
  return "환경·인허가 변경 가능성, 실제 현장 실사 및 재무 검증 필요";
}

export function calculateTargetFit({
  candidate,
  projectLocation,
  askingPrice = ASKING_PRICE,
}: TargetFitInput): TargetFitResult {
  const industryScore = scoreIndustry(candidate);
  const locationScore = scoreLocation(candidate.region ?? projectLocation);
  const facilityNeedScore = scoreFacilityNeed(candidate);
  const expansionSignalScore = scoreExpansion(candidate);
  const financialScore = scoreFinancial(candidate);
  const permitScore = scorePermit(candidate);
  const decisionMakerScore = scoreContact(candidate);

  const priceFactor = askingPrice ? 1 : 0.9;
  const fitScore = clamp(
    (industryScore +
      locationScore +
      facilityNeedScore +
      expansionSignalScore +
      financialScore +
      permitScore +
      decisionMakerScore) *
      priceFactor,
  );

  return {
    fitScore,
    targetGrade: gradeFromScore(fitScore),
    financialScore: clamp(financialScore * 6),
    locationScore: clamp(locationScore * 6),
    facilityNeedScore: clamp(facilityNeedScore * 6),
    expansionSignalScore: clamp(expansionSignalScore * 6),
    decisionMakerScore: clamp(decisionMakerScore * 20),
    recommendedUse: buildRecommendedUse(candidate),
    targetingReason: buildTargetingReason(candidate, projectLocation),
    riskFactors: buildRiskFactors(candidate),
  };
}

export function applyTargetFit(
  candidate: SearchCandidate,
  input: Omit<TargetFitInput, "candidate">,
): SearchCandidate {
  const fit = calculateTargetFit({ candidate, ...input });
  return {
    ...candidate,
    ...fit,
  };
}
