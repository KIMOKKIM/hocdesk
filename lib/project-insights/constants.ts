export const ProjectInsightCategory = {
  POLITICS: "POLITICS",
  SOCIETY: "SOCIETY",
  ECONOMY: "ECONOMY",
  INFRASTRUCTURE: "INFRASTRUCTURE",
} as const;

export type ProjectInsightCategoryValue =
  (typeof ProjectInsightCategory)[keyof typeof ProjectInsightCategory];

export const PROJECT_INSIGHT_CATEGORIES: ProjectInsightCategoryValue[] = [
  ProjectInsightCategory.POLITICS,
  ProjectInsightCategory.SOCIETY,
  ProjectInsightCategory.ECONOMY,
  ProjectInsightCategory.INFRASTRUCTURE,
];

export const projectInsightCategoryLabels: Record<
  ProjectInsightCategoryValue,
  string
> = {
  POLITICS: "정치",
  SOCIETY: "사회",
  ECONOMY: "경제",
  INFRASTRUCTURE: "지역 인프라",
};

export type InsightSeedContent = {
  category: ProjectInsightCategoryValue;
  title: string;
  summary: string;
  keyIssues: string[];
  saleImpact: string;
  opportunities: string[];
  risks: string[];
  sourceNotes: string;
  sourceUrls: string[];
};

export const DEFAULT_JINWOONG_INSIGHTS: InsightSeedContent[] = [
  {
    category: "POLITICS",
    title: "정치",
    summary:
      "양주시 및 경기북부 지역 개발정책, 산업단지·교통망·지역 현안은 산업용 부동산의 활용 가능성에 영향을 줄 수 있습니다.",
    keyIssues: [
      "지방정부의 산업입지 정책",
      "경기북부 개발 방향",
      "경마장 유치 등 지역 현안(확정 아님)",
      "환경·민원 관련 행정 기조",
    ],
    saleImpact:
      "정책 방향에 따라 산업용 부지의 활용성, 인허가 가능성, 매수자 관심 업종이 달라질 수 있습니다.",
    opportunities: [
      "경기북부 개발 기대",
      "산업용 부지 수요",
      "지역 정책 변화에 따른 신규사업 가능성",
    ],
    risks: [
      "인허가 불확실성",
      "주민 민원 가능성",
      "정책 변화에 따른 일정 지연",
    ],
    sourceNotes:
      "규칙 기반 초기 분석. 확인되지 않은 정책·유치 계획을 확정 사실로 단정하지 않습니다.",
    sourceUrls: [],
  },
  {
    category: "SOCIETY",
    title: "사회",
    summary:
      "지역 주민 수용성, 고용 창출 가능성, 환경 민원, 교통 혼잡 우려 등은 매각 후 활용방안에 직접적인 영향을 줄 수 있습니다.",
    keyIssues: [
      "환경 민원",
      "지역 고용",
      "교통량 증가",
      "지역사회 수용성",
    ],
    saleImpact:
      "매수자가 폐차·자원순환·물류 등 민원 가능성이 있는 업종일 경우 지역사회 수용성을 사전에 검토해야 합니다.",
    opportunities: [
      "고용 창출형 신규사업",
      "지역경제 활성화",
      "기존 공장부지의 재활용",
    ],
    risks: [
      "환경 우려",
      "대형차량 운행 증가",
      "주민 반대 가능성",
    ],
    sourceNotes:
      "규칙 기반 초기 분석. 환경·민원 영향은 현장·행정 확인이 필요합니다.",
    sourceUrls: [],
  },
  {
    category: "ECONOMY",
    title: "경제",
    summary:
      "염료산업은 성장성이 제한적인 업종으로 판단되며, 매각 전략은 기존 제조업 승계보다 신규사업 부지 활용 관점이 적합합니다.",
    keyIssues: [
      "염료산업 사양화",
      "53억원 희망 매각가",
      "기존 설비 철거 가능성",
      "공업사·폐차장·자원순환·물류 업종 관심",
    ],
    saleImpact:
      "매수자는 기존 공장·설비보다 토지와 입지를 중심으로 검토할 가능성이 높습니다.",
    opportunities: [
      "주변 시세 대비 검토 가능한 가격대",
      "신규사업 목적의 산업용 부지 활용",
      "경기북부 산업용 토지 수요",
    ],
    risks: [
      "철거비 부담",
      "토양·환경 실사 필요",
      "매수자 자금조달 부담",
    ],
    sourceNotes:
      "규칙 기반 초기 분석. 토양오염 없음·인허가 가능을 단정하지 않습니다.",
    sourceUrls: [],
  },
  {
    category: "INFRASTRUCTURE",
    title: "지역 인프라",
    summary:
      "도로 접근성, 산업단지와의 거리, 물류 이동성, 주변 개발계획은 매수자 타깃 선정에 중요한 기준입니다.",
    keyIssues: [
      "도로 접근성",
      "대형차량 진입 가능성",
      "산업단지·물류거점 접근성",
      "양주 및 경기북부 개발축",
    ],
    saleImpact:
      "물류·창고·정비·자원순환·상용차 관련 업종은 부지 면적과 차량 접근성을 중요하게 판단합니다.",
    opportunities: [
      "경기북부 물류·산업 거점 가능성",
      "넓은 부지 활용성",
      "신규 시설 재구축 가능성",
    ],
    risks: [
      "진입도로 조건",
      "인허가 제한",
      "주변 주거지와의 거리",
    ],
    sourceNotes:
      "규칙 기반 초기 분석. 현장 접근성·인허가는 별도 실사가 필요합니다.",
    sourceUrls: [],
  },
];
