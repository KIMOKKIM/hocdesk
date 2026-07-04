import {
  collectionRecommendationFromScore,
  EXPANSION_SCORE_WEIGHTS,
} from "@/lib/constants/activity";
import type {
  AnalyzeActivityInput,
  ActivityAnalysisResult,
  NewTargetSuggestionItem,
} from "@/lib/analysis/types";
import { prisma } from "@/lib/prisma";

type SegmentRule = {
  segment: string;
  keywords: string[];
  industryGroup: string;
  defaultKeywords: string[];
  assetFitHint?: string;
};

const SEGMENT_RULES: SegmentRule[] = [
  {
    segment: "중고 상용차 수출업체",
    keywords: [
      "중고 상용차",
      "트럭 매매",
      "버스 매매",
      "차량 보관",
      "상용차 수출",
    ],
    industryGroup: "운송·물류",
    defaultKeywords: ["중고 상용차 수출", "트럭 수출", "차량 야적장"],
    assetFitHint: "넓은 차량 보관공간",
  },
  {
    segment: "중고차 수출업",
    keywords: ["중고차 수출", "차량 수출", "수출 야적장", "자동차 수출단지"],
    industryGroup: "운송·물류",
    defaultKeywords: ["중고차 수출", "차량 수출", "수출 야적장"],
  },
  {
    segment: "대형차 정비업체",
    keywords: ["대형차 정비", "트럭 정비", "버스 정비", "건설기계 정비"],
    industryGroup: "운송·물류",
    defaultKeywords: ["대형차 정비", "트럭 정비", "상용차 정비센터"],
    assetFitHint: "정비 공장 및 야드",
  },
  {
    segment: "자원순환·재활용",
    keywords: ["고철", "비철", "재활용", "폐기물", "해체"],
    industryGroup: "환경·에너지",
    defaultKeywords: ["고철 재활용", "폐기물 처리", "자동차 해체"],
  },
  {
    segment: "물류·창고",
    keywords: ["물류", "창고", "보관", "배송거점", "야적장"],
    industryGroup: "운송·물류",
    defaultKeywords: ["물류 창고", "야적장", "배송거점"],
  },
  {
    segment: "건설·중장비",
    keywords: ["중장비", "건설장비", "가설재", "건축자재", "골재"],
    industryGroup: "건설·장비",
    defaultKeywords: ["중장비", "건설장비", "건축자재"],
  },
  {
    segment: "폐차장",
    keywords: ["폐차장", "자동차 폐차", "폐차"],
    industryGroup: "환경·에너지",
    defaultKeywords: ["폐차장", "자동차 해체"],
  },
];

const REFERRAL_KEYWORDS = ["조언", "추천", "적합", "더 적합", "검토할 가치"];

const NEGATIVE_KEYWORDS = [
  "가격",
  "비싸다",
  "철거비",
  "오염",
  "토양",
  "인허가",
  "도로",
  "자금",
  "대출",
  "이전계획 없음",
  "관심 없음",
  "부담",
  "우려",
  "어렵",
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function extractEvidence(text: string, terms: string[]): string[] {
  const sentences = text
    .split(/[\.\n!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const matched = sentences.filter((sentence) =>
    terms.some((term) => sentence.includes(term)),
  );
  return matched.length > 0 ? matched : [`본문에서 관련 단서 감지: ${terms[0]}`];
}

async function countSegmentInProject(projectId: string, segment: string) {
  return prisma.projectCompany.count({
    where: {
      projectId,
      OR: [
        { company: { detailedIndustry: { contains: segment.slice(0, 4) } } },
        { company: { industryGroup: { contains: segment.slice(0, 2) } } },
      ],
    },
  });
}

async function scoreSuggestion(
  input: AnalyzeActivityInput,
  rule: SegmentRule,
  evidence: string[],
): Promise<NewTargetSuggestionItem> {
  const text = input.rawText;
  const breakdown: Record<string, number> = {};

  breakdown.marketClue = includesAny(text, rule.keywords)
    ? EXPANSION_SCORE_WEIGHTS.MARKET_CLUE
    : 0;

  breakdown.directReferral =
    includesAny(text, REFERRAL_KEYWORDS) && includesAny(text, rule.keywords)
      ? EXPANSION_SCORE_WEIGHTS.DIRECT_REFERRAL
      : 0;

  breakdown.assetFit =
    rule.assetFitHint && includesAny(text, ["보관", "공간", "부지", "야드", "활용"])
      ? EXPANSION_SCORE_WEIGHTS.ASSET_FIT
      : includesAny(text, rule.keywords)
        ? Math.floor(EXPANSION_SCORE_WEIGHTS.ASSET_FIT / 2)
        : 0;

  const existingCount = await countSegmentInProject(input.projectId, rule.segment);
  breakdown.dbGap =
    existingCount < 3
      ? EXPANSION_SCORE_WEIGHTS.DB_GAP
      : Math.floor(EXPANSION_SCORE_WEIGHTS.DB_GAP / 2);

  breakdown.buyingPower = includesAny(text, ["구매", "인수", "매입", "확장"])
    ? EXPANSION_SCORE_WEIGHTS.BUYING_POWER
    : Math.floor(EXPANSION_SCORE_WEIGHTS.BUYING_POWER / 2);

  breakdown.regionalExpansion = input.projectLocation
    ? EXPANSION_SCORE_WEIGHTS.REGIONAL_EXPANSION
    : Math.floor(EXPANSION_SCORE_WEIGHTS.REGIONAL_EXPANSION / 2);

  const recommendationScore = Object.values(breakdown).reduce(
    (sum, value) => sum + value,
    0,
  );

  const priority =
    recommendationScore >= 70
      ? "HIGH"
      : recommendationScore >= 50
        ? "MEDIUM"
        : "LOW";

  const referralNote = breakdown.directReferral
    ? "접촉 업체의 직접 추천 단서가 확인되었습니다."
    : "업무 기록에서 시장 단서가 확인되었습니다.";

  return {
    segment: rule.segment,
    reason: `${rule.segment} 업종은 ${referralNote} 현재 매각 자산과의 활용 적합성(점수 ${recommendationScore}점)을 기준으로 추가수집 후보로 판단됩니다.`,
    evidence,
    recommendationScore,
    priority,
    regions: [input.projectLocation ?? "경기도 양주시"],
    keywords: rule.defaultKeywords,
    targetCount: priority === "HIGH" ? 20 : 10,
    scoreBreakdown: breakdown,
  };
}

function buildObjectionSentences(text: string): string[] {
  const objections: string[] = [];
  if (includesAny(text, ["가격"]) && includesAny(text, ["부담", "높", "비싸"])) {
    objections.push("가격 부담이 주요 장벽으로 반복 언급되었습니다.");
  }
  if (includesAny(text, ["철거비", "철거"])) {
    objections.push("철거비 불확실성 및 비용 부담이 제기되었습니다.");
  }
  if (includesAny(text, ["토양", "오염"])) {
    objections.push("토양오염 우려와 관련 자료 요청이 반복되었습니다.");
  }
  if (includesAny(text, ["인허가", "도로"])) {
    objections.push("인허가·도로 접근 등 행정/물리적 제약이 거론되었습니다.");
  }
  if (includesAny(text, ["자금", "대출"])) {
    objections.push("자금 조달 및 대출 관련 부담이 언급되었습니다.");
  }
  if (
    includesAny(text, ["이전"]) &&
    includesAny(text, ["없", "없음", "계획 없"])
  ) {
    objections.push("이전·확장 계획 부재로 관심이 제한적입니다.");
  }
  if (includesAny(text, ["관심 없", "관심이 없"])) {
    objections.push("명시적 관심 부족 또는 거절 의사가 확인되었습니다.");
  }
  return objections;
}

function buildPositiveSentences(text: string): string[] {
  const signals: string[] = [];
  if (includesAny(text, REFERRAL_KEYWORDS)) {
    signals.push(
      "접촉 업체로부터 신규 업종·세그먼트에 대한 구체적 추천 단서를 확보했습니다.",
    );
  }
  if (includesAny(text, ["관심", "검토", "투자 검토"])) {
    signals.push("일부 업체에서 추가 검토 또는 투자 검토 의사가 확인되었습니다.");
  }
  if (includesAny(text, ["현장 방문", "자료 요청"])) {
    signals.push("현장 방문 또는 추가 자료 요청 등 긍정적 후속 신호가 있습니다.");
  }
  if (includesAny(text, ["가격 협의", "이전 계획", "확장 계획"])) {
    signals.push("가격 협의 또는 이전·확장 계획 관련 논의 가능성이 있습니다.");
  }
  return signals;
}

function buildNegativeSentences(text: string): string[] {
  const signals: string[] = [];
  if (includesAny(text, NEGATIVE_KEYWORDS)) {
    signals.push(
      "가격·비용·환경·행정 등 복합적 부담 요인이 업무 기록 전반에 나타납니다.",
    );
  }
  if (includesAny(text, ["보류", "어렵"])) {
    signals.push("즉각적 의사결정보다 보류·추가 검토가 필요한 분위기입니다.");
  }
  return signals;
}

export async function analyzeWithRules(
  input: AnalyzeActivityInput,
): Promise<ActivityAnalysisResult> {
  const text = input.rawText;
  const positiveSignals = buildPositiveSentences(text);
  const negativeSignals = buildNegativeSentences(text);
  const objections = buildObjectionSentences(text);
  const recommendedActions: string[] = [];

  const newTargetSuggestions: NewTargetSuggestionItem[] = [];

  for (const rule of SEGMENT_RULES) {
    if (!includesAny(text, rule.keywords)) continue;
    const evidence = extractEvidence(text, rule.keywords);
    newTargetSuggestions.push(await scoreSuggestion(input, rule, evidence));
  }

  newTargetSuggestions.sort(
    (a, b) => b.recommendationScore - a.recommendationScore,
  );

  const topScore = newTargetSuggestions[0]?.recommendationScore ?? 0;
  const expansionScore =
    newTargetSuggestions.length > 0
      ? Math.round(
          newTargetSuggestions.reduce(
            (sum, item) => sum + item.recommendationScore,
            0,
          ) / newTargetSuggestions.length,
        )
      : 0;

  const collectionRecommended = collectionRecommendationFromScore(
    Math.max(topScore, expansionScore),
  );

  if (collectionRecommended === "ACTIVE") {
    recommendedActions.push(
      "50점 이상 신규 세그먼트에 대해 관리자 승인 후 제한적 추가수집을 검토하세요.",
    );
  } else if (collectionRecommended === "REVIEW") {
    recommendedActions.push(
      "관리자 검토 후 키워드·지역 범위를 확정하고 추가수집 승인 여부를 결정하세요.",
    );
  } else {
    recommendedActions.push("추가수집은 보류하고 기존 타깃 접촉을 지속하세요.");
  }

  if (objections.length > 0) {
    recommendedActions.push(
      "가격·철거비·환경자료 FAQ 및 협상 포인트를 정리해 후속 접촉에 활용하세요.",
    );
  }
  if (input.activityType === "PHONE") {
    recommendedActions.push("전화 접촉 결과를 타깃별 후속 일정으로 등록하세요.");
  }

  const contacted = input.contactedCompanyNames?.length
    ? ` (접촉 ${input.contactedCompanyNames.length}곳)`
    : "";

  const segmentSummary =
    newTargetSuggestions.length > 0
      ? ` 신규 업종 단서 ${newTargetSuggestions.length}건(최고 ${topScore}점)이 추출되었습니다.`
      : " 신규 업종 단서는 확인되지 않았습니다.";

  const objectionSummary =
    objections.length > 0
      ? ` 주요 부담: ${objections.map((o) => o.replace(/\.$/, "")).join(", ")}.`
      : "";

  return {
    dailySummary: `${activityTypeSummary(input)}${contacted}: ${summarizeText(text)}.${objectionSummary}${segmentSummary}`,
    positiveSignals,
    negativeSignals,
    objections,
    newTargetSuggestions,
    recommendedActions,
    collectionRecommended,
    expansionScore: Math.max(topScore, expansionScore),
    analyzer: "rules",
    analyzedAt: new Date().toISOString(),
  };
}

function activityTypeSummary(input: AnalyzeActivityInput) {
  switch (input.activityType) {
    case "PHONE":
      return "전화 영업 활동";
    case "EMAIL":
      return "이메일 접촉";
    case "MEETING":
      return "미팅";
    case "SITE_VISIT":
      return "현장 방문";
    case "RESEARCH":
      return "리서치";
    default:
      return "일일 업무";
  }
}

function summarizeText(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}
