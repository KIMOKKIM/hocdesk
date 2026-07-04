import type { SearchPlan } from "@/lib/collection/types";

export type KakaoSearchQuery = {
  segment: string;
  region: string;
  query: string;
  priority: number;
  expectedUse: string;
};

const SEGMENT_QUERY_TEMPLATES: Record<
  string,
  (regionShort: string, regionFull: string) => string[]
> = {
  자동차해체재활용업: (short, full) => [
    `${full} 자동차해체재활용`,
    `${short} 폐차장`,
    `${full} 자동차 해체`,
  ],
  폐차장: (short, full) => [
    `${short} 폐차장`,
    `${full} 자동차 폐차`,
    `${short} 폐차`,
  ],
  "대형차 정비업": (short, full) => [
    `${full} 대형차 정비`,
    `${short} 트럭 정비`,
    `${short} 버스 정비`,
  ],
  "건설기계 정비업": (short, full) => [
    `${full} 건설기계 정비`,
    `${short} 중장비 정비`,
    `${short} 건설기계`,
  ],
  "중고 상용차 매매업": (short, full) => [
    `${full} 중고 상용차`,
    `${short} 상용차 매매`,
    `${short} 중고 트럭`,
  ],
  "중고차 수출업": (short, full) => [
    `${short} 중고차 수출`,
    `${full} 중고차 수출`,
    `인천 중고차 수출`,
  ],
  "고철·비철 재활용업": (short) => [
    `${short} 고철`,
    `${short} 비철금속`,
    `경기북부 자원순환`,
  ],
  "산업폐기물 수집운반업": (short, regionFull) => [
    `${short} 산업폐기물`,
    `${regionFull} 폐기물 수집`,
    `${short} 재활용업체`,
  ],
  "건축자재 물류업": (short, full) => [
    `${short} 건축자재 물류`,
    `${full} 물류창고`,
    `${short} 물류창고`,
  ],
  "중장비 임대업": (short, full) => [
    `${short} 중장비 임대`,
    `${full} 건설기계 임대`,
    `${short} 장비 임대`,
  ],
  "산업용 부동산 개발업": (short, full) => [
    `${short} 공장 전문 부동산`,
    `${full} 산업용 부동산`,
    `${short} 산업용 부동산`,
  ],
  "공장·창고 전문 중개업": (short, full) => [
    `${short} 공장 창고 중개`,
    `${short} 공장 중개`,
    `${full} 창고 중개`,
  ],
};

function regionShort(region: string) {
  return region
    .replace("경기도 ", "")
    .replace("인천광역시", "인천")
    .replace("시", "");
}

function expectedUseForSegment(segmentName: string): string {
  const map: Record<string, string> = {
    자동차해체재활용업: "폐차·해체 및 재활용 처리시설",
    폐차장: "폐차장 및 해체 야적",
    "대형차 정비업": "대형 상용차 정비·주차 야드",
    "건설기계 정비업": "건설기계 보관·정비 거점",
    "중고 상용차 매매업": "중고 상용차 매매·검수장",
    "중고차 수출업": "중고차·상용차 수출 검수장",
    "고철·비철 재활용업": "고철·비철 분류 야적장",
    "산업폐기물 수집운반업": "산업폐기물 수집·운반 거점",
    "건축자재 물류업": "건축자재 유통·야적센터",
    "중장비 임대업": "중장비 임대·보관 야드",
    "산업용 부동산 개발업": "산업용 부지 개발 및 분양",
    "공장·창고 전문 중개업": "공장·창고 매매 중개",
  };
  return map[segmentName] ?? "산업용 부지 활용";
}

export function buildKakaoSearchQueries(
  searchPlan: SearchPlan,
): KakaoSearchQuery[] {
  const seen = new Set<string>();
  const queries: KakaoSearchQuery[] = [];
  const regions =
    searchPlan.regions.length > 0
      ? searchPlan.regions
      : searchPlan.segments.map((s) => s.region);

  for (const segment of searchPlan.segments) {
    const segmentRegions = regions.includes(segment.region)
      ? [segment.region, ...regions.filter((r) => r !== segment.region)]
      : [segment.region, ...regions];

    const templateFn =
      SEGMENT_QUERY_TEMPLATES[segment.segmentName] ??
      ((short: string, full: string) => [
        `${full} ${segment.keywords[0] ?? segment.segmentName}`,
        `${short} ${segment.keywords[0] ?? segment.segmentName}`,
      ]);

    for (const region of segmentRegions.slice(0, 2)) {
      const short = regionShort(region);
      const generated = templateFn(short, region);

      for (let i = 0; i < generated.length; i++) {
        const query = generated[i]!.trim();
        const key = query.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        queries.push({
          segment: segment.segmentName,
          region,
          query,
          priority: queries.length + 1,
          expectedUse: expectedUseForSegment(segment.segmentName),
        });
      }
    }
  }

  return queries.sort((a, b) => a.priority - b.priority);
}

export function enrichSearchPlanWithKakaoQueries(
  searchPlan: SearchPlan,
  provider: string,
): SearchPlan {
  const generatedQueries = buildKakaoSearchQueries(searchPlan);
  return {
    ...searchPlan,
    provider,
    generatedQueries,
    queryCount: generatedQueries.length,
    requestedRegions: searchPlan.regions,
    requestedSegments: searchPlan.segments.map((s) => s.segmentName),
  };
}
