import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";

export const CollectionJobType = {
  INITIAL: "INITIAL",
  EXPANSION: "EXPANSION",
} as const;

export type CollectionJobTypeValue =
  (typeof CollectionJobType)[keyof typeof CollectionJobType];

export { COLLECTION_LIMITS };

export const INITIAL_TARGET_REGIONS = [
  "경기도 양주시",
  "경기도 의정부시",
  "경기도 포천시",
  "경기도 동두천시",
  "경기도 남양주시",
  "경기도 파주시",
  "경기도 김포시",
  "인천광역시",
] as const;

export type InitialCollectionSegment = {
  segmentName: string;
  industryGroup: string;
  keywords: string[];
  region: string;
};

export const DEFAULT_INITIAL_SEGMENTS: InitialCollectionSegment[] = [
  {
    segmentName: "자동차해체재활용업",
    industryGroup: "환경·에너지",
    keywords: ["자동차 해체", "폐차 재활용", "자동차 재활용"],
    region: "경기도 양주시",
  },
  {
    segmentName: "폐차장",
    industryGroup: "운송·물류",
    keywords: ["폐차장", "자동차 폐차"],
    region: "경기도 양주시",
  },
  {
    segmentName: "대형차 정비업",
    industryGroup: "운송·물류",
    keywords: ["대형차 정비", "상용차 정비"],
    region: "경기도 의정부시",
  },
  {
    segmentName: "건설기계 정비업",
    industryGroup: "건설·장비",
    keywords: ["건설기계 정비", "중장비 정비"],
    region: "경기도 포천시",
  },
  {
    segmentName: "중고 상용차 매매업",
    industryGroup: "운송·물류",
    keywords: ["중고 상용차", "상용차 매매"],
    region: "경기도 동두천시",
  },
  {
    segmentName: "중고차 수출업",
    industryGroup: "운송·물류",
    keywords: ["중고차 수출", "수출 중고차"],
    region: "경기도 김포시",
  },
  {
    segmentName: "고철·비철 재활용업",
    industryGroup: "환경·에너지",
    keywords: ["고철 재활용", "비철금속 재활용"],
    region: "경기도 남양주시",
  },
  {
    segmentName: "산업폐기물 수집운반업",
    industryGroup: "환경·에너지",
    keywords: ["산업폐기물", "폐기물 수집운반"],
    region: "경기도 파주시",
  },
  {
    segmentName: "건축자재 물류업",
    industryGroup: "건설·장비",
    keywords: ["건축자재 물류", "건축자재 유통"],
    region: "경기도 양주시",
  },
  {
    segmentName: "중장비 임대업",
    industryGroup: "건설·장비",
    keywords: ["중장비 임대", "건설기계 임대"],
    region: "경기도 포천시",
  },
  {
    segmentName: "산업용 부동산 개발업",
    industryGroup: "부동산·개발",
    keywords: ["산업용 부동산", "산업단지 개발"],
    region: "인천광역시",
  },
  {
    segmentName: "공장·창고 전문 중개업",
    industryGroup: "부동산·개발",
    keywords: ["공장 중개", "창고 중개"],
    region: "경기도 양주시",
  },
];

export function buildInitialSearchPlan(
  projectId: string,
  requestedCount: number = COLLECTION_LIMITS.maxInitialCandidates,
) {
  const maxTotal = Math.min(
    requestedCount,
    COLLECTION_LIMITS.maxInitialCandidates,
  );
  const keywords = DEFAULT_INITIAL_SEGMENTS.flatMap((segment) => segment.keywords);

  return {
    projectId,
    jobType: CollectionJobType.INITIAL,
    type: CollectionJobType.INITIAL,
    region: "경기 북부",
    regions: [...INITIAL_TARGET_REGIONS],
    keywords,
    requestedCount: maxTotal,
    maxTotal,
    maxPerSegment: COLLECTION_LIMITS.maxPerSegment,
    segments: DEFAULT_INITIAL_SEGMENTS.map((segment) => ({
      ...segment,
      maxCount: COLLECTION_LIMITS.maxPerSegment,
    })),
  };
}

export function estimateInitialCollectionCount(requestedCount: number = COLLECTION_LIMITS.maxInitialCandidates) {
  const maxTotal = Math.min(
    requestedCount,
    COLLECTION_LIMITS.maxInitialCandidates,
  );
  return Math.min(
    maxTotal,
    DEFAULT_INITIAL_SEGMENTS.length * COLLECTION_LIMITS.maxPerSegment,
  );
}

export function buildExpansionSearchPlan(params: {
  projectId: string;
  segmentName: string;
  keywords: string[];
  regions: string[];
  targetCount: number;
}) {
  const maxTotal = Math.min(
    params.targetCount,
    COLLECTION_LIMITS.maxInitialCandidates,
  );

  return {
    projectId: params.projectId,
    jobType: CollectionJobType.EXPANSION,
    type: CollectionJobType.EXPANSION,
    region: params.regions[0] ?? "경기도 양주시",
    regions: params.regions,
    keywords: params.keywords,
    requestedCount: maxTotal,
    maxTotal,
    maxPerSegment: Math.min(maxTotal, COLLECTION_LIMITS.maxPerSegment),
    segments: [
      {
        segmentName: params.segmentName,
        industryGroup: params.segmentName,
        keywords: params.keywords,
        region: params.regions[0] ?? "경기도 양주시",
        maxCount: maxTotal,
      },
    ],
  };
}
