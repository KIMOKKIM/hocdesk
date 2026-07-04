import {
  validateIndustryFit,
  type IndustryValidationResult,
} from "@/lib/collection/industry-validation";
import {
  isKakaoApiConfigured,
  KakaoApiError,
  searchKakaoLocal,
} from "@/lib/collection/providers/kakao-local-client";

export type KakaoTestErrorCode =
  | "API_KEY_MISSING"
  | "AUTHENTICATION_FAILED"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "NO_RESULTS"
  | "NETWORK_ERROR";

export type KakaoTestResult = {
  configured: boolean;
  success: boolean;
  query: string;
  resultCount: number;
  elapsedMs: number;
  errorCode?: KakaoTestErrorCode;
  errorMessage?: string;
  results: Array<{
    placeName: string;
    categoryName: string;
    phone: string | null;
    address: string | null;
    placeUrl: string | null;
    validation: IndustryValidationResult;
    score: number;
  }>;
};

function mapKakaoError(error: unknown): { code: KakaoTestErrorCode; message: string } {
  if (error instanceof KakaoApiError) {
    switch (error.code) {
      case "MISSING_API_KEY":
        return { code: "API_KEY_MISSING", message: error.message };
      case "UNAUTHORIZED":
        return { code: "AUTHENTICATION_FAILED", message: error.message };
      case "FORBIDDEN":
        return { code: "PERMISSION_DENIED", message: error.message };
      case "QUOTA_EXCEEDED":
        return { code: "RATE_LIMITED", message: error.message };
      case "TIMEOUT":
        return { code: "TIMEOUT", message: error.message };
      case "INVALID_RESPONSE":
        return { code: "INVALID_RESPONSE", message: error.message };
      default:
        return { code: "NETWORK_ERROR", message: error.message };
    }
  }
  return {
    code: "NETWORK_ERROR",
    message: error instanceof Error ? error.message : "알 수 없는 오류",
  };
}

export async function runKakaoConnectionTest(
  query: string,
  segmentName = "폐차장",
): Promise<KakaoTestResult> {
  if (!isKakaoApiConfigured()) {
    return {
      configured: false,
      success: false,
      query,
      resultCount: 0,
      elapsedMs: 0,
      errorCode: "API_KEY_MISSING",
      errorMessage:
        "KAKAO_REST_API_KEY가 설정되지 않았습니다. .env에 입력 후 개발 서버를 재시작하세요.",
      results: [],
    };
  }

  const started = Date.now();
  try {
    const response = await searchKakaoLocal({ query, page: 1, size: 5 });
    const elapsedMs = Date.now() - started;

    if (response.documents.length === 0) {
      return {
        configured: true,
        success: false,
        query,
        resultCount: 0,
        elapsedMs,
        errorCode: "NO_RESULTS",
        errorMessage: "검색 결과가 없습니다.",
        results: [],
      };
    }

    const results = response.documents.slice(0, 5).map((place) => {
      const validation = validateIndustryFit({
        segmentName,
        companyName: place.place_name,
        categoryName: place.category_name,
        categoryGroupName: place.category_group_name,
        searchKeyword: query,
        address: place.road_address_name || place.address_name,
      });
      return {
        placeName: place.place_name,
        categoryName: place.category_name,
        phone: place.phone || null,
        address: place.road_address_name || place.address_name || null,
        placeUrl: place.place_url || null,
        validation: validation.result,
        score: validation.score,
      };
    });

    return {
      configured: true,
      success: true,
      query,
      resultCount: results.length,
      elapsedMs,
      results,
    };
  } catch (error) {
    const mapped = mapKakaoError(error);
    return {
      configured: mapped.code !== "API_KEY_MISSING",
      success: false,
      query,
      resultCount: 0,
      elapsedMs: Date.now() - started,
      errorCode: mapped.code,
      errorMessage: mapped.message,
      results: [],
    };
  }
}
