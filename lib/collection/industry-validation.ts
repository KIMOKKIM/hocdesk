import { INDUSTRY_RULES, type IndustryRuleSet } from "@/lib/collection/industry-rules";

export type IndustryValidationResult = "ACCEPT" | "REVIEW" | "REJECT";
export type SourceConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ValidationInput = {
  segmentName: string;
  companyName: string;
  categoryName?: string | null;
  categoryGroupName?: string | null;
  searchKeyword?: string | null;
  region?: string | null;
  address?: string | null;
};

export type ValidationScoreBreakdown = {
  nameScore: number;
  categoryScore: number;
  queryScore: number;
  regionScore: number;
  forbiddenPenalty: number;
  total: number;
  reasons: string[];
};

function containsAny(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function scoreKeywordMatch(text: string, keywords: string[], weight: number) {
  if (keywords.length === 0) return 0;
  const matches = keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase()));
  if (matches.length === 0) return 0;
  return Math.min(weight, Math.round(weight * (matches.length / keywords.length) + 10));
}

function getRules(segmentName: string): IndustryRuleSet {
  return (
    INDUSTRY_RULES[segmentName] ?? {
      requiredKeywords: [],
      optionalKeywords: [],
      forbiddenKeywords: [],
      categoryKeywords: [],
      reviewKeywords: [],
      minimumMatchScore: 40,
    }
  );
}

export function scoreIndustryFit(input: ValidationInput): ValidationScoreBreakdown {
  const rules = getRules(input.segmentName);
  const haystack = [
    input.companyName,
    input.categoryName ?? "",
    input.categoryGroupName ?? "",
    input.searchKeyword ?? "",
    input.address ?? "",
  ].join(" ");

  const reasons: string[] = [];
  let forbiddenPenalty = 0;

  if (containsAny(haystack, rules.forbiddenKeywords)) {
    forbiddenPenalty = 50;
    reasons.push("금지 키워드 포함");
  }

  const nameScore = scoreKeywordMatch(
    input.companyName,
    [...rules.requiredKeywords, ...rules.optionalKeywords],
    30,
  );
  if (nameScore > 0) reasons.push("업체명 키워드 일치");

  const categoryScore = scoreKeywordMatch(
    `${input.categoryName ?? ""} ${input.categoryGroupName ?? ""}`,
    [...rules.categoryKeywords, ...rules.requiredKeywords],
    25,
  );
  if (categoryScore > 0) reasons.push("카테고리 키워드 일치");

  const queryScore = input.searchKeyword
    ? scoreKeywordMatch(
        input.searchKeyword,
        [...rules.requiredKeywords, ...rules.optionalKeywords, ...rules.reviewKeywords],
        20,
      )
    : 0;
  if (queryScore > 0) reasons.push("검색어 관련성");

  let regionScore = 0;
  if (input.region && input.address?.includes(input.region.replace("경기도 ", ""))) {
    regionScore = 10;
    reasons.push("지역 일치");
  } else if (input.region && containsAny(input.address ?? "", [input.region])) {
    regionScore = 10;
    reasons.push("지역 일치");
  }

  const total = Math.max(
    0,
    nameScore + categoryScore + queryScore + regionScore - forbiddenPenalty,
  );

  return {
    nameScore,
    categoryScore,
    queryScore,
    regionScore,
    forbiddenPenalty,
    total,
    reasons,
  };
}

export function validateIndustryFit(input: ValidationInput): {
  result: IndustryValidationResult;
  confidence: SourceConfidence;
  score: number;
  reason: string;
  scoreBreakdown: ValidationScoreBreakdown;
} {
  const rules = getRules(input.segmentName);
  const scoreBreakdown = scoreIndustryFit(input);
  const score = scoreBreakdown.total;

  if (scoreBreakdown.forbiddenPenalty > 0 && score < 40) {
    return {
      result: "REJECT",
      confidence: "LOW",
      score,
      reason: scoreBreakdown.reasons.join(", ") || "금지 업종",
      scoreBreakdown,
    };
  }

  if (score >= 70) {
    return {
      result: "ACCEPT",
      confidence: "HIGH",
      score,
      reason: scoreBreakdown.reasons.join(", ") || "업종 적합",
      scoreBreakdown,
    };
  }

  if (score >= rules.minimumMatchScore) {
    return {
      result: "REVIEW",
      confidence: "MEDIUM",
      score,
      reason: scoreBreakdown.reasons.join(", ") || "추가 검토 필요",
      scoreBreakdown,
    };
  }

  return {
    result: "REJECT",
    confidence: "LOW",
    score,
    reason: scoreBreakdown.reasons.join(", ") || "검색 업종과 무관",
    scoreBreakdown,
  };
}

export function extractRegionFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const match = address.match(
    /(경기도\s*[가-힣]+시|인천광역시\s*[가-힣]+구|인천광역시|서울특별시\s*[가-힣]+구)/,
  );
  return match?.[1] ?? null;
}
