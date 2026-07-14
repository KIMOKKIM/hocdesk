/**
 * Kakao 검색어 1건 단위 실행 (Vercel serverless 친화)
 */
import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";
import {
  extractRegionFromAddress,
  validateIndustryFit,
} from "@/lib/collection/industry-validation";
import { buildKakaoKeyMissingMessage } from "@/lib/collection/kakao-env";
import {
  delay,
  isKakaoApiConfigured,
  KakaoApiError,
  searchKakaoLocal,
} from "@/lib/collection/providers/kakao-local-client";
import type { KakaoSearchQuery } from "@/lib/collection/types";
import type { SearchCandidate } from "@/lib/collection/types";

export type SingleQuerySearchResult = {
  query: string;
  candidates: SearchCandidate[];
  queryRawCount: number;
  apiCallCount: number;
  industryAccepted: number;
  industryReview: number;
  industryRejected: number;
};

function assertKakaoConfigured() {
  if (!isKakaoApiConfigured()) {
    throw new KakaoApiError(
      buildKakaoKeyMissingMessage("auto"),
      503,
      "MISSING_API_KEY",
    );
  }
}

function mapPlaceToCandidate(
  place: {
    id: string;
    place_name: string;
    category_name: string;
    category_group_name: string;
    phone: string;
    address_name: string;
    road_address_name: string;
    place_url: string;
    x: string;
    y: string;
  },
  queryItem: KakaoSearchQuery,
): SearchCandidate {
  const segment = queryItem.segment;
  const address = place.road_address_name || place.address_name || null;

  return {
    companyName: place.place_name.trim(),
    industryGroup: segment,
    detailedIndustry: segment,
    region: extractRegionFromAddress(address) ?? queryItem.region,
    address,
    mainPhone: place.phone?.trim() || null,
    website: null,
    websiteDomain: null,
    generalEmail: null,
    representativeName: null,
    employeeCount: null,
    estimatedRevenue: null,
    currentFacilityType: place.category_group_name || null,
    sourceType: "KAKAO_LOCAL",
    sourceUrl: place.place_url || null,
    searchKeyword: queryItem.query,
    discoveredReason: `KakaoLocal: ${segment} / ${queryItem.query} / ${queryItem.region}`,
    recommendedUse: queryItem.expectedUse,
    targetingReason: `${queryItem.region} 일대 ${segment} 업종 — Kakao Local 검색`,
    riskFactors: "외부 검색 데이터 — 현장 실사 및 연락처 확인 필요",
    externalId: place.id,
    provider: "kakao",
    placeName: place.place_name,
    categoryName: place.category_name,
    categoryGroupName: place.category_group_name,
    placeUrl: place.place_url,
    latitude: place.x,
    longitude: place.y,
    rawAddress: place.address_name,
    roadAddress: place.road_address_name,
    isDemo: false,
    rawMetadata: {
      category_name: place.category_name,
      category_group_name: place.category_group_name,
    },
  };
}

/**
 * 검색어 1개만 Kakao Local API로 조회하고 업종 검증까지 수행한다.
 * REJECT는 candidates에 넣지 않고 industryRejected로만 집계한다.
 */
export async function searchKakaoSingleQuery(
  queryItem: KakaoSearchQuery,
  options?: { seenExternalIds?: Set<string> },
): Promise<SingleQuerySearchResult> {
  assertKakaoConfigured();

  const seen = options?.seenExternalIds ?? new Set<string>();
  const candidates: SearchCandidate[] = [];
  let queryRawCount = 0;
  let apiCallCount = 0;
  let industryAccepted = 0;
  let industryReview = 0;
  let industryRejected = 0;

  for (let page = 1; page <= EXTERNAL_SEARCH_LIMITS.maxPagesPerQuery; page += 1) {
    if (page > 1) {
      await delay(EXTERNAL_SEARCH_LIMITS.requestDelayMs);
    }

    apiCallCount += 1;
    let response;
    try {
      response = await searchKakaoLocal({
        query: queryItem.query,
        page,
        size: EXTERNAL_SEARCH_LIMITS.pageSize,
        sort: "accuracy",
      });
    } catch (error) {
      if (error instanceof KakaoApiError && error.code === "QUOTA_EXCEEDED") {
        await delay(2000);
        response = await searchKakaoLocal({
          query: queryItem.query,
          page,
          size: EXTERNAL_SEARCH_LIMITS.pageSize,
          sort: "accuracy",
        });
      } else {
        throw error;
      }
    }

    queryRawCount += response.documents.length;

    for (const place of response.documents) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);

      const candidate = mapPlaceToCandidate(place, queryItem);
      const validation = validateIndustryFit({
        segmentName: queryItem.segment,
        companyName: candidate.companyName,
        categoryName: candidate.categoryName,
        categoryGroupName: candidate.categoryGroupName,
        searchKeyword: queryItem.query,
        region: queryItem.region,
        address: candidate.address,
      });

      candidate.industryValidation = validation.result;
      candidate.sourceConfidence = validation.confidence;
      candidate.rawMetadata = {
        ...(candidate.rawMetadata ?? {}),
        validationScore: validation.score,
        scoreBreakdown: validation.scoreBreakdown,
        validationReason: validation.reason,
      };

      if (validation.result === "REJECT") {
        industryRejected += 1;
        continue;
      }

      if (validation.result === "REVIEW") {
        industryReview += 1;
      } else {
        industryAccepted += 1;
      }

      candidates.push(candidate);
    }

    if (response.meta.is_end) break;
  }

  return {
    query: queryItem.query,
    candidates,
    queryRawCount,
    apiCallCount,
    industryAccepted,
    industryReview,
    industryRejected,
  };
}
