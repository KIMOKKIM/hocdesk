import type {
  SearchCandidate,
  SearchPlan,
  TargetSearchProvider,
  ValidationResult,
} from "@/lib/collection/types";
import {
  calcSearchProgressPercent,
  CollectionProgressStep,
  updateJobProgress,
} from "@/lib/collection/progress";
import {
  extractDomain,
  normalizeAddress,
  normalizePhone,
} from "@/lib/format";

const SEED_DUPLICATE_NAMES = [
  "경기북부 상용차센터 데모",
  "양주 자원순환산업 데모",
  "북부산업물류 데모",
  "미래창고개발 데모",
  "스마트물류거점 데모",
  "한강건설기계 데모",
  "북부중고차수출 데모",
];

const NAME_CORES = [
  "상용차정비",
  "자동차해체",
  "중장비센터",
  "중고차수출",
  "산업물류",
  "폐차재활용",
  "건설기계정비",
  "고철재활용",
  "건축자재센터",
  "창고물류",
  "부동산개발",
  "공장중개",
];

const FACILITY_TYPES = [
  "정비공장",
  "폐차장",
  "물류센터",
  "재활용시설",
  "야적장",
  "임대야드",
  "중개사무소",
  "창고단지",
];

const USE_CASES = [
  "대형 상용차 정비·주차 야드",
  "폐차·해체 및 재활용 처리시설",
  "건설기계 보관·정비 거점",
  "중고차·상용차 수출 검수장",
  "3PL·크로스독 물류센터",
  "고철·비철 분류 야적장",
  "건축자재 유통·야적센터",
  "산업용 부지 개발 및 분양",
];

const RISK_FACTORS = [
  "환경 인허가 변경 필요, 기존 염료 시설 잔존물 처리 비용 검토 필요",
  "토양·잔류물 조사 및 정화 비용 발생 가능",
  "주민 민원 및 소음·진동 관리 필요",
  "철거·포장 공사 CAPEX 검토 필요",
  "임대·분양 수요 변동성 존재",
  "데모 데이터 — 실제 현장 실사 및 재무 검증 필요",
];

function regionShort(region: string) {
  return region
    .replace("경기도 ", "")
    .replace("인천광역시", "인천")
    .replace("시", "");
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length]!;
}

export class DemoSearchProvider implements TargetSearchProvider {
  readonly name = "demo";

  async searchCompanies(searchPlan: SearchPlan): Promise<SearchCandidate[]> {
    const results: SearchCandidate[] = [];
    let globalIndex = 0;

    const totalQueries = Math.max(
      1,
      searchPlan.segments.length * Math.max(1, searchPlan.regions.length || 1),
    );
    let processedQueries = 0;

    if (searchPlan.jobId) {
      await updateJobProgress(searchPlan.jobId, {
        totalQueries,
        processedQueries: 0,
        currentStep: CollectionProgressStep.SEARCH_READY,
        progressPercent: 10,
        lastMessage: `데모 검색: 총 ${totalQueries}개 구간을 처리합니다.`,
      });
    }

    for (const segment of searchPlan.segments) {
      const regions =
        searchPlan.regions.length > 0 ? searchPlan.regions : [segment.region];
      const maxPerSegment = segment.maxCount ?? searchPlan.maxPerSegment;

      for (const region of regions) {
        if (searchPlan.jobId) {
          await updateJobProgress(searchPlan.jobId, {
            currentStep: CollectionProgressStep.CALLING_API,
            currentQuery: `${region} ${segment.segmentName}`,
            processedQueries,
            totalQueries,
            progressPercent: calcSearchProgressPercent(
              processedQueries,
              totalQueries,
            ),
            lastMessage: `데모 검색 중: ${region} / ${segment.segmentName}`,
          });
        }

        for (let i = 0; i < maxPerSegment; i++) {
          if (results.length >= searchPlan.maxTotal) break;

          globalIndex += 1;
          const keyword = pick(segment.keywords, globalIndex);
          const duplicateName =
            globalIndex % 4 === 0
              ? SEED_DUPLICATE_NAMES[
                  Math.floor(globalIndex / 4) % SEED_DUPLICATE_NAMES.length
                ]
              : undefined;

          results.push(
            this.buildCandidate({
              segment,
              region,
              keyword,
              globalIndex,
              localIndex: i + 1,
              forceName: duplicateName,
            }),
          );
        }

        processedQueries += 1;
        if (searchPlan.jobId) {
          await updateJobProgress(searchPlan.jobId, {
            processedQueries,
            totalQueries,
            progressPercent: calcSearchProgressPercent(
              processedQueries,
              totalQueries,
            ),
            rawResultCount: results.length,
            lastMessage: `데모 구간 처리 완료: 원본 ${results.length}건`,
          });
        }

        if (results.length >= searchPlan.maxTotal) break;
      }

      if (results.length >= searchPlan.maxTotal) break;
    }

    return results.slice(0, searchPlan.maxTotal);
  }

  normalizeCompany(candidate: SearchCandidate): SearchCandidate {
    const websiteDomain = candidate.website
      ? extractDomain(candidate.website)
      : candidate.websiteDomain;

    return {
      ...candidate,
      companyName: candidate.companyName.trim(),
      normalizedAddress: candidate.address
        ? normalizeAddress(candidate.address)
        : candidate.normalizedAddress,
      websiteDomain: websiteDomain ?? null,
      mainPhone: candidate.mainPhone ? normalizePhone(candidate.mainPhone) : null,
    };
  }

  validateCandidate(candidate: SearchCandidate): ValidationResult {
    if (!candidate.companyName.trim()) {
      return { valid: false, reason: "업체명 없음" };
    }

    if (!candidate.searchKeyword.trim()) {
      return { valid: false, reason: "검색 키워드 없음" };
    }

    if (!candidate.companyName.includes("데모")) {
      return {
        valid: false,
        reason: "DemoSearchProvider는 '데모'가 포함된 업체명만 허용",
      };
    }

    return { valid: true };
  }

  private buildCandidate({
    segment,
    region,
    keyword,
    globalIndex,
    localIndex,
    forceName,
  }: {
    segment: SearchPlan["segments"][number];
    region: string;
    keyword: string;
    globalIndex: number;
    localIndex: number;
    forceName?: string;
  }): SearchCandidate {
    const shortRegion = regionShort(region);
    const core = pick(NAME_CORES, globalIndex + localIndex);
    const companyName =
      forceName ?? `${shortRegion}${core} 데모 ${String(localIndex).padStart(2, "0")}`;

    const phoneMiddle = String(700 + (globalIndex % 90)).padStart(3, "0");
    const phoneLast = String(1000 + globalIndex * 7).slice(-4);
    const slug = `demo-${globalIndex}-${localIndex}-${shortRegion}${core}`
      .replace(/[^\w-]/g, "")
      .toLowerCase();

    return {
      companyName,
      industryGroup: segment.industryGroup,
      detailedIndustry: segment.segmentName,
      region,
      address: `${region} 산업단지로 ${120 + globalIndex}`,
      representativeName: pick(
        ["데모 대표", "데모 운영팀", "데모 사업부"],
        globalIndex,
      ),
      mainPhone: `031-${phoneMiddle}-${phoneLast}`,
      generalEmail: `contact-${slug}@demo-target.example.com`,
      website: `https://${slug}.demo-target.example.com`,
      employeeCount: 12 + (globalIndex % 55),
      estimatedRevenue: `${18 + (globalIndex % 95)}억`,
      currentFacilityType: pick(FACILITY_TYPES, globalIndex),
      sourceType: "DEMO_SEARCH",
      sourceUrl: `https://demo-search.example.com/results?q=${encodeURIComponent(keyword)}`,
      searchKeyword: keyword,
      discoveredReason: `DemoSearchProvider: ${segment.segmentName} / ${keyword} / ${region}`,
      recommendedUse: pick(USE_CASES, globalIndex),
      targetingReason: `${region} 일대 ${segment.segmentName} 업종의 대형 부지·야적 수요`,
      riskFactors: pick(RISK_FACTORS, globalIndex),
    };
  }
}

export function normalizeCandidateBase(
  candidate: SearchCandidate,
): SearchCandidate {
  const websiteDomain = candidate.website
    ? extractDomain(candidate.website)
    : candidate.websiteDomain;

  return {
    ...candidate,
    companyName: candidate.companyName.trim(),
    normalizedAddress: candidate.address
      ? normalizeAddress(candidate.address)
      : candidate.normalizedAddress,
    websiteDomain: websiteDomain ?? null,
    mainPhone: candidate.mainPhone ? normalizePhone(candidate.mainPhone) : null,
  };
}

export function validateCandidateBase(
  candidate: SearchCandidate,
): ValidationResult {
  if (!candidate.companyName.trim()) {
    return { valid: false, reason: "업체명 없음" };
  }
  if (!candidate.searchKeyword.trim()) {
    return { valid: false, reason: "검색 키워드 없음" };
  }
  return { valid: true };
}
