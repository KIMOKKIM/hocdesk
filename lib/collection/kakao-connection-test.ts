import {
  validateIndustryFit,
  type IndustryValidationResult,
} from "@/lib/collection/industry-validation";
import {
  buildKakaoKeyMissingMessage,
  getKakaoEnvRuntimeMeta,
  inspectKakaoRestApiKey,
  isKakaoApiConfigured,
  maskKakaoApiKey,
  PERMISSION_DENIED_USER_MESSAGE,
} from "@/lib/collection/kakao-env";
import {
  KakaoApiError,
  searchKakaoLocal,
} from "@/lib/collection/providers/kakao-local-client";
import { recordKakaoConnectionTest } from "@/lib/db/search-provider-status";
import {
  KAKAO_LOCAL_ENDPOINT,
  KAKAO_PERMISSION_CHECKLIST,
} from "@/lib/projects/jinwoong-sale-content";

export type KakaoTestErrorCode =
  | "API_KEY_MISSING"
  | "AUTHENTICATION_FAILED"
  | "PERMISSION_DENIED"
  | "INVALID_APP_KEY_TYPE"
  | "LOCAL_API_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "NO_RESULTS"
  | "NETWORK_ERROR";

export type KakaoTestDiagnostics = {
  keyPresent: boolean;
  keyMasked: string | null;
  endpoint: "keyword";
  endpointUrl: string;
  provider: "kakao";
  environment: string;
  vercel: boolean;
  keyWarnings: string[];
  kakaoErrorType?: string | null;
  kakaoMessage?: string | null;
};

export type KakaoTestResult = {
  configured: boolean;
  success: boolean;
  query: string;
  resultCount: number;
  elapsedMs: number;
  errorCode?: KakaoTestErrorCode;
  errorMessage?: string;
  message?: string;
  diagnostics: KakaoTestDiagnostics;
  checklist?: string[];
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

function baseDiagnostics(
  extras?: Partial<KakaoTestDiagnostics>,
): KakaoTestDiagnostics {
  const inspection = inspectKakaoRestApiKey();
  const runtime = getKakaoEnvRuntimeMeta();
  return {
    keyPresent: inspection.present,
    keyMasked: inspection.masked ?? maskKakaoApiKey(),
    endpoint: "keyword",
    endpointUrl: KAKAO_LOCAL_ENDPOINT,
    provider: "kakao",
    environment: runtime.environment,
    vercel: runtime.vercel,
    keyWarnings: inspection.warnings,
    ...extras,
  };
}

function mapKakaoError(error: unknown): {
  code: KakaoTestErrorCode;
  message: string;
  kakaoErrorType?: string | null;
  kakaoMessage?: string | null;
} {
  if (error instanceof KakaoApiError) {
    switch (error.code) {
      case "MISSING_API_KEY":
        return {
          code: "API_KEY_MISSING",
          message: buildKakaoKeyMissingMessage("auto"),
        };
      case "UNAUTHORIZED":
        return {
          code: "AUTHENTICATION_FAILED",
          message: error.message,
          kakaoErrorType: error.kakaoErrorType,
          kakaoMessage: error.kakaoMessage,
        };
      case "LOCAL_API_NOT_ALLOWED":
        return {
          code: "LOCAL_API_NOT_ALLOWED",
          message: error.message,
          kakaoErrorType: error.kakaoErrorType,
          kakaoMessage: error.kakaoMessage,
        };
      case "INVALID_APP_KEY_TYPE":
        return {
          code: "INVALID_APP_KEY_TYPE",
          message: error.message,
          kakaoErrorType: error.kakaoErrorType,
          kakaoMessage: error.kakaoMessage,
        };
      case "FORBIDDEN":
        return {
          code: "PERMISSION_DENIED",
          message: PERMISSION_DENIED_USER_MESSAGE,
          kakaoErrorType: error.kakaoErrorType,
          kakaoMessage: error.kakaoMessage,
        };
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

function shouldAttachChecklist(code?: KakaoTestErrorCode) {
  return (
    code === "PERMISSION_DENIED" ||
    code === "LOCAL_API_NOT_ALLOWED" ||
    code === "INVALID_APP_KEY_TYPE" ||
    code === "AUTHENTICATION_FAILED" ||
    code === "API_KEY_MISSING"
  );
}

export async function runKakaoConnectionTest(
  query: string,
  segmentName = "폐차장",
): Promise<KakaoTestResult> {
  if (!isKakaoApiConfigured()) {
    const message = buildKakaoKeyMissingMessage("auto");
    const result: KakaoTestResult = {
      configured: false,
      success: false,
      query,
      resultCount: 0,
      elapsedMs: 0,
      errorCode: "API_KEY_MISSING",
      errorMessage: message,
      message,
      diagnostics: baseDiagnostics(),
      checklist: [...KAKAO_PERMISSION_CHECKLIST],
      results: [],
    };
    await recordKakaoConnectionTest({
      success: false,
      errorCode: "API_KEY_MISSING",
      message,
    });
    return result;
  }

  const started = Date.now();
  try {
    const response = await searchKakaoLocal({ query, page: 1, size: 5 });
    const elapsedMs = Date.now() - started;

    if (response.documents.length === 0) {
      const result: KakaoTestResult = {
        configured: true,
        success: false,
        query,
        resultCount: 0,
        elapsedMs,
        errorCode: "NO_RESULTS",
        errorMessage: "검색 결과가 없습니다.",
        message: "검색 결과가 없습니다.",
        diagnostics: baseDiagnostics(),
        results: [],
      };
      await recordKakaoConnectionTest({
        success: false,
        errorCode: "NO_RESULTS",
        message: result.message,
      });
      return result;
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

    const result: KakaoTestResult = {
      configured: true,
      success: true,
      query,
      resultCount: results.length,
      elapsedMs,
      message: "연결 테스트 성공. DB는 변경되지 않았습니다.",
      diagnostics: baseDiagnostics(),
      results,
    };
    await recordKakaoConnectionTest({
      success: true,
      errorCode: null,
      message: result.message,
    });
    return result;
  } catch (error) {
    const mapped = mapKakaoError(error);
    const result: KakaoTestResult = {
      configured: mapped.code !== "API_KEY_MISSING",
      success: false,
      query,
      resultCount: 0,
      elapsedMs: Date.now() - started,
      errorCode: mapped.code,
      errorMessage: mapped.message,
      message: mapped.message,
      diagnostics: baseDiagnostics({
        kakaoErrorType: mapped.kakaoErrorType ?? null,
        kakaoMessage: mapped.kakaoMessage ?? null,
      }),
      checklist: shouldAttachChecklist(mapped.code)
        ? [...KAKAO_PERMISSION_CHECKLIST]
        : undefined,
      results: [],
    };
    await recordKakaoConnectionTest({
      success: false,
      errorCode: mapped.code,
      message: mapped.message,
    });
    return result;
  }
}
