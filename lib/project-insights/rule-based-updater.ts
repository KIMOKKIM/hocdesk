import type { InsightSeedContent } from "@/lib/project-insights/constants";
import {
  DEFAULT_JINWOONG_INSIGHTS,
  ProjectInsightCategory,
  type ProjectInsightCategoryValue,
} from "@/lib/project-insights/constants";
import { formatKoreanWon } from "@/lib/format";

type RuleUpdaterInput = {
  category: ProjectInsightCategoryValue;
  project: {
    name: string;
    companyName: string;
    location: string | null;
    askingPrice: bigint | null;
    summary: string | null;
    propertyType: string | null;
    landArea: string | null;
  };
  existing?: InsightSeedContent | null;
  targetCount?: number;
  pendingReviewCount?: number;
  contactReadyCount?: number;
  recentActivityCount?: number;
  collectionJobCount?: number;
  candidateCount?: number;
};

export type RuleUpdaterResult = {
  summary: string;
  keyIssues: string[];
  saleImpact: string;
  opportunities: string[];
  risks: string[];
  sourceNotes: string;
  sourceUrls: string[];
};

/**
 * 규칙 기반 분석 업데이트.
 * 확인되지 않은 사실(경마장 유치 확정, 토양오염 없음, 인허가 가능 등)을 단정하지 않는다.
 */
export function buildRuleBasedInsight(
  input: RuleUpdaterInput,
): RuleUpdaterResult {
  const base =
    input.existing ??
    DEFAULT_JINWOONG_INSIGHTS.find((item) => item.category === input.category) ??
    DEFAULT_JINWOONG_INSIGHTS[0]!;

  const asking = formatKoreanWon(input.project.askingPrice);
  const location = input.project.location ?? "양주·경기북부";
  const targetNote =
    typeof input.targetCount === "number"
      ? `현재 등록 타깃 ${input.targetCount}곳`
      : "타깃 등록 현황은 수시 변동";
  const reviewNote =
    typeof input.pendingReviewCount === "number"
      ? `검토대기 ${input.pendingReviewCount}곳`
      : null;
  const activityNote =
    typeof input.recentActivityCount === "number"
      ? `최근 활동 ${input.recentActivityCount}건`
      : null;

  switch (input.category) {
    case ProjectInsightCategory.POLITICS:
      return {
        summary: `${location} 일대 산업입지·개발정책·행정 기조는 ${input.project.companyName} 매각 후 활용 가능성에 영향을 줄 수 있습니다. 지방선거·지역 현안은 향후 정책 환경에 반영될 수 있으나 확정된 결과로 단정하지 않습니다.`,
        keyIssues: [
          "지방정부의 산업입지·인허가 정책",
          `${location} 개발 방향`,
          "경마장 유치 등 지역 현안은 검토 이슈로만 관리(확정 표현 금지)",
          "환경·민원 관련 행정 대응 가능성",
        ],
        saleImpact:
          "정책·행정 환경에 따라 인허가 일정, 활용 가능 업종, 매수자 관심도가 달라질 수 있습니다. 확정되지 않은 유치·개발 계획을 전제로 한 가격·일정 약속은 피해야 합니다.",
        opportunities: [
          "경기북부 개발 기대에 따른 산업용 부지 관심",
          "정책 변화에 따른 신규사업 입지 검토 기회",
          "지역 산업단지·교통망 개선 논의와의 연계 가능성",
        ],
        risks: [
          "인허가 불확실성",
          "주민 민원·행정 지연 가능성",
          "정책 변화로 인한 일정 재검토 필요",
        ],
        sourceNotes: [
          "규칙 기반 업데이트",
          targetNote,
          reviewNote,
          activityNote,
          "경마장 유치·정책 확정은 공식 확인 전까지 단정하지 않음",
        ]
          .filter(Boolean)
          .join(" · "),
        sourceUrls: [],
      };

    case ProjectInsightCategory.SOCIETY:
      return {
        summary: `${location} 지역사회 수용성, 고용 창출, 환경·교통 민원은 매각 후 활용방안 선정에 직접 영향을 줄 수 있습니다. ${targetNote}을(를) 기준으로 민원 가능 업종은 사전 검토가 필요합니다.`,
        keyIssues: [
          "환경 민원·수용성",
          "지역 고용 창출 가능성",
          "대형차량 교통량 증가 우려",
          "폐차·자원순환·물류 등 민원 가능 업종 검토",
        ],
        saleImpact:
          "민원 가능성이 높은 업종을 타깃으로 할 경우, 지역사회 소통·환경 관리 계획을 매수자 검토 항목에 포함해야 합니다.",
        opportunities: [
          "고용 창출형 신규사업으로의 전환",
          "기존 공장부지 재활용을 통한 지역경제 기여",
          "지역과 상생하는 사업 모델 제시 여지",
        ],
        risks: [
          "환경 우려 및 민원",
          "대형차량 운행 증가",
          "주민 반대에 따른 사업 지연 가능성",
        ],
        sourceNotes: [
          "규칙 기반 업데이트",
          targetNote,
          reviewNote,
          "환경·민원 영향은 현장·행정 확인 필요",
        ]
          .filter(Boolean)
          .join(" · "),
        sourceUrls: [],
      };

    case ProjectInsightCategory.ECONOMY:
      return {
        summary: `염료 제조업의 성장성은 제한적으로 보이며, ${asking} 희망가 기준 매각은 기존 설비 승계보다 산업용 부지·입지 활용에 초점을 두는 것이 적합합니다. ${targetNote}.`,
        keyIssues: [
          "염료산업 사양화 가능성",
          `희망 매각가 ${asking}`,
          "기존 설비 철거·재구축 비용 가능성",
          "공업사·폐차장·자원순환·물류 업종 관심",
          reviewNote ?? "검토대기·연락준비 상태 모니터링",
        ].filter(Boolean) as string[],
        saleImpact:
          "매수자는 공장·설비보다 토지·면적·입지를 중심으로 검토할 가능성이 높습니다. 철거비·환경 실사 비용을 가격 협상 변수로 관리해야 합니다.",
        opportunities: [
          "산업용 토지로서의 신규사업 활용",
          "경기북부 산업·물류 수요와의 정합성",
          "희망가 대비 입지 가치 검토 여지",
        ],
        risks: [
          "철거비 부담",
          "토양·환경 실사 필요(오염 유무 단정 금지)",
          "매수자 자금조달·협상 지연",
        ],
        sourceNotes: [
          "규칙 기반 업데이트",
          targetNote,
          typeof input.candidateCount === "number"
            ? `검색 후보 ${input.candidateCount}건`
            : null,
          "토양오염 없음·인허가 가능을 단정하지 않음",
        ]
          .filter(Boolean)
          .join(" · "),
        sourceUrls: [],
      };

    case ProjectInsightCategory.INFRASTRUCTURE:
      return {
        summary: `${location} 도로 접근성, 대형차량 진입성, 산업단지·물류거점과의 거리는 매수자 타깃 선정 핵심 기준입니다. 부지(${input.project.landArea ?? "면적 확인 필요"})와 차량 동선이 중요합니다.`,
        keyIssues: [
          "도로 접근성·진입로 조건",
          "대형차량 진입 가능성",
          "산업단지·물류거점 접근성",
          `${location} 개발축·주변 인프라`,
        ],
        saleImpact:
          "물류·창고·정비·자원순환·상용차 관련 업종은 부지 면적과 차량 접근성을 우선 평가합니다. 진입도로·인허가 제한은 사전 확인이 필요합니다.",
        opportunities: [
          "경기북부 물류·산업 거점 가능성",
          "넓은 부지 재구축 여지",
          "신규 시설 배치 유연성",
        ],
        risks: [
          "진입도로·동선 제약 가능성",
          "인허가·용도 제한 가능성(확정 아님)",
          "주변 주거지와의 거리·민원 연계",
        ],
        sourceNotes: [
          "규칙 기반 업데이트",
          typeof input.collectionJobCount === "number"
            ? `수집 작업 ${input.collectionJobCount}건`
            : null,
          "현장 접근성·인허가는 별도 실사 필요",
        ]
          .filter(Boolean)
          .join(" · "),
        sourceUrls: [],
      };

    default:
      return {
        summary: base.summary,
        keyIssues: base.keyIssues,
        saleImpact: base.saleImpact,
        opportunities: base.opportunities,
        risks: base.risks,
        sourceNotes: "규칙 기반 업데이트",
        sourceUrls: [],
      };
  }
}
