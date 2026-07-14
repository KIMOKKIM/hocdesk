import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";
import {
  extractRegionFromAddress,
  validateIndustryFit,
} from "@/lib/collection/industry-validation";
import {
  buildKakaoSearchQueries,
  enrichSearchPlanWithKakaoQueries,
} from "@/lib/collection/kakao-search-queries";
import { buildKakaoKeyMissingMessage } from "@/lib/collection/kakao-env";
import { collectionAudit } from "@/lib/collection/logger";
import {
  calcSearchProgressPercent,
  CollectionProgressStep,
  isJobCancelRequested,
  updateJobProgress,
} from "@/lib/collection/progress";
import {
  delay,
  isKakaoApiConfigured,
  KakaoApiError,
  searchKakaoLocal,
} from "@/lib/collection/providers/kakao-local-client";
import { normalizeCandidateBase, validateCandidateBase } from "@/lib/collection/providers/demo-search-provider";
import type {
  SearchCandidate,
  SearchPlan,
  TargetSearchProvider,
  ValidationResult,
} from "@/lib/collection/types";
import { normalizeAddress, normalizePhone } from "@/lib/format";

export type KakaoSearchContext = {
  jobId?: string;
  apiCallCount: number;
  rawResultCount: number;
  industryAccepted: number;
  industryReview: number;
  industryRejected: number;
  pagesRequested: number;
  cancelled?: boolean;
};

export type SearchProgressCallbacks = {
  onQueryStart?: (info: {
    query: string;
    processedQueries: number;
    totalQueries: number;
  }) => void | Promise<void>;
  onQueryComplete?: (info: {
    query: string;
    processedQueries: number;
    totalQueries: number;
    apiCallCount: number;
    rawResultCount: number;
    queryRawCount: number;
  }) => void | Promise<void>;
  onProgress?: (info: {
    currentQuery: string | null;
    processedQueries: number;
    totalQueries: number;
    apiCallCount: number;
    rawResultCount: number;
  }) => void | Promise<void>;
};

export function assertKakaoConfigured() {
  if (!isKakaoApiConfigured()) {
    throw new KakaoApiError(
      buildKakaoKeyMissingMessage("auto"),
      503,
      "MISSING_API_KEY",
    );
  }
}

export class KakaoLocalSearchProvider implements TargetSearchProvider {
  readonly name = "kakao";
  private context: KakaoSearchContext = createEmptyContext();

  async searchCompanies(
    searchPlan: SearchPlan,
    callbacks?: SearchProgressCallbacks,
  ): Promise<SearchCandidate[]> {
    assertKakaoConfigured();
    this.context = createEmptyContext();
    this.context.jobId = searchPlan.jobId ?? this.context.jobId;

    const enrichedPlan = enrichSearchPlanWithKakaoQueries(searchPlan, this.name);
    const queries = buildKakaoSearchQueries(enrichedPlan).slice(
      0,
      EXTERNAL_SEARCH_LIMITS.maxQueriesPerJob,
    );

    if (queries.length === 0) {
      throw new Error("Kakao 검색어가 생성되지 않았습니다.");
    }

    if (this.context.jobId) {
      await updateJobProgress(this.context.jobId, {
        totalQueries: queries.length,
        processedQueries: 0,
        currentStep: CollectionProgressStep.SEARCH_READY,
        progressPercent: 10,
        lastMessage: `총 ${queries.length}개 검색어를 처리합니다.`,
      });
    }

    const seenExternalIds = new Set<string>();
    const results: SearchCandidate[] = [];
    let processedQueries = 0;

    for (const item of queries) {
      if (results.length >= EXTERNAL_SEARCH_LIMITS.maxRawResultsPerJob) break;

      if (this.context.jobId && (await isJobCancelRequested(this.context.jobId))) {
        this.context.cancelled = true;
        break;
      }

      if (this.context.jobId) {
        await updateJobProgress(this.context.jobId, {
          currentStep: CollectionProgressStep.CALLING_API,
          currentQuery: item.query,
          processedQueries,
          totalQueries: queries.length,
          progressPercent: calcSearchProgressPercent(processedQueries, queries.length),
          apiCallCount: this.context.apiCallCount,
          rawResultCount: this.context.rawResultCount,
          reviewRequiredCount: this.context.industryReview,
          lastMessage: `검색어 처리 중: ${item.query}`,
        });
      }
      await callbacks?.onQueryStart?.({
        query: item.query,
        processedQueries,
        totalQueries: queries.length,
      });
      await callbacks?.onProgress?.({
        currentQuery: item.query,
        processedQueries,
        totalQueries: queries.length,
        apiCallCount: this.context.apiCallCount,
        rawResultCount: this.context.rawResultCount,
      });

      let queryRawCount = 0;

      for (let page = 1; page <= EXTERNAL_SEARCH_LIMITS.maxPagesPerQuery; page++) {
        if (results.length >= EXTERNAL_SEARCH_LIMITS.maxRawResultsPerJob) break;

        if (page > 1 || item !== queries[0]) {
          await delay(EXTERNAL_SEARCH_LIMITS.requestDelayMs);
        }

        this.context.apiCallCount += 1;
        this.context.pagesRequested += 1;

        let response;
        try {
          response = await searchKakaoLocal({
            query: item.query,
            page,
            size: EXTERNAL_SEARCH_LIMITS.pageSize,
            sort: "accuracy",
          });
        } catch (error) {
          if (error instanceof KakaoApiError) {
            if (error.code === "QUOTA_EXCEEDED" && this.context.jobId) {
              await updateJobProgress(this.context.jobId, {
                currentStep: CollectionProgressStep.CALLING_API,
                lastMessage: CollectionProgressStep.RATE_LIMITED,
              });
              await delay(2000);
              try {
                response = await searchKakaoLocal({
                  query: item.query,
                  page,
                  size: EXTERNAL_SEARCH_LIMITS.pageSize,
                  sort: "accuracy",
                });
              } catch (retryError) {
                throw retryError;
              }
            } else if (error.code === "TIMEOUT" && this.context.jobId) {
              await updateJobProgress(this.context.jobId, {
                currentStep: CollectionProgressStep.CALLING_API,
                lastMessage: CollectionProgressStep.RESPONSE_DELAYED,
              });
              throw error;
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }

        if (!response) throw new Error("Kakao API 응답이 없습니다.");

        queryRawCount += response.documents.length;
        this.context.rawResultCount += response.documents.length;

        if (this.context.jobId) {
          collectionAudit(this.context.jobId, "EXTERNAL_SEARCH_QUERY_COMPLETED", {
            query: item.query,
            page,
            resultCount: response.documents.length,
            segment: item.segment,
          });
        }

        for (const place of response.documents) {
          if (seenExternalIds.has(place.id)) continue;
          seenExternalIds.add(place.id);

          const candidate = this.mapPlaceToCandidate(place, item);
          const validation = validateIndustryFit({
            segmentName: item.segment,
            companyName: candidate.companyName,
            categoryName: candidate.categoryName,
            categoryGroupName: candidate.categoryGroupName,
            searchKeyword: item.query,
            region: item.region,
            address: candidate.address,
          });

          candidate.industryValidation = validation.result;
          candidate.sourceConfidence = validation.confidence;
          candidate.rawMetadata = {
            validationScore: validation.score,
            scoreBreakdown: validation.scoreBreakdown,
            validationReason: validation.reason,
          };

          if (validation.result === "REJECT") {
            this.context.industryRejected += 1;
            if (this.context.jobId) {
              collectionAudit(this.context.jobId, "EXTERNAL_COMPANY_REJECTED", {
                name: candidate.companyName,
                segment: item.segment,
                reason: validation.reason,
              });
            }
            continue;
          }

          if (validation.result === "REVIEW") {
            this.context.industryReview += 1;
          } else {
            this.context.industryAccepted += 1;
          }

          results.push(candidate);
        }

        if (response.meta.is_end) break;
      }

      processedQueries += 1;
      if (this.context.jobId) {
        await updateJobProgress(this.context.jobId, {
          currentStep: CollectionProgressStep.CALLING_API,
          currentQuery: item.query,
          processedQueries,
          totalQueries: queries.length,
          progressPercent: calcSearchProgressPercent(processedQueries, queries.length),
          apiCallCount: this.context.apiCallCount,
          rawResultCount: this.context.rawResultCount,
          reviewRequiredCount: this.context.industryReview,
          lastMessage: `검색어 ${item.query} 처리 완료: 원본 ${queryRawCount}건`,
        });
      }
      await callbacks?.onQueryComplete?.({
        query: item.query,
        processedQueries,
        totalQueries: queries.length,
        apiCallCount: this.context.apiCallCount,
        rawResultCount: this.context.rawResultCount,
        queryRawCount,
      });
      await callbacks?.onProgress?.({
        currentQuery: item.query,
        processedQueries,
        totalQueries: queries.length,
        apiCallCount: this.context.apiCallCount,
        rawResultCount: this.context.rawResultCount,
      });
    }

    if (this.context.cancelled) {
      return results;
    }

    if (results.length === 0) {
      // 실패로 처리하지 않고 빈 결과로 완료 경로를 탄다 (결과 없음 상태 구분)
      return [];
    }

    return results.slice(0, searchPlan.maxTotal);
  }

  setJobContext(jobId: string) {
    this.context.jobId = jobId;
  }

  getContext(): KakaoSearchContext {
    return { ...this.context };
  }

  normalizeCompany(candidate: SearchCandidate): SearchCandidate {
    const normalized = normalizeCandidateBase(candidate);
    return {
      ...normalized,
      mainPhone: normalized.mainPhone ? normalizePhone(normalized.mainPhone) : null,
      normalizedAddress: normalized.address
        ? normalizeAddress(normalized.address)
        : normalized.normalizedAddress,
      website: null,
      websiteDomain: null,
      generalEmail: null,
      representativeName: null,
      employeeCount: null,
      estimatedRevenue: null,
      businessNumber: null,
      corporateNumber: null,
    };
  }

  validateCandidate(candidate: SearchCandidate): ValidationResult {
    const base = validateCandidateBase(candidate);
    if (!base.valid) return base;

    if (candidate.isDemo) {
      return { valid: false, reason: "실제 검색 Provider는 데모 업체를 허용하지 않습니다." };
    }

    if (candidate.companyName.includes("데모")) {
      return { valid: false, reason: "데모 업체명은 실제 검색 결과로 등록할 수 없습니다." };
    }

    if (candidate.generalEmail) {
      return { valid: false, reason: "확인되지 않은 이메일은 저장할 수 없습니다." };
    }

    if (candidate.website) {
      return { valid: false, reason: "확인되지 않은 홈페이지는 저장할 수 없습니다." };
    }

    if (candidate.industryValidation === "REJECT") {
      return { valid: false, reason: "업종 적합성 검증 실패" };
    }

    return { valid: true };
  }

  private mapPlaceToCandidate(
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
    queryItem: { segment: string; region: string; query: string; expectedUse: string },
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
      provider: this.name,
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
}

function createEmptyContext(): KakaoSearchContext {
  return {
    apiCallCount: 0,
    rawResultCount: 0,
    industryAccepted: 0,
    industryReview: 0,
    industryRejected: 0,
    pagesRequested: 0,
  };
}
