import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";
import {
  getKakaoRestApiKey,
  isKakaoApiConfigured,
  PERMISSION_DENIED_USER_MESSAGE,
} from "@/lib/collection/kakao-env";
import { KAKAO_LOCAL_ENDPOINT } from "@/lib/projects/jinwoong-sale-content";

export type KakaoLocalPlace = {
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
  distance: string;
};

export type KakaoLocalSearchResponse = {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
  documents: KakaoLocalPlace[];
};

export type KakaoSearchParams = {
  query: string;
  page?: number;
  size?: number;
  sort?: "accuracy" | "distance";
  x?: string;
  y?: string;
  radius?: number;
};

export type KakaoErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "LOCAL_API_NOT_ALLOWED"
  | "INVALID_APP_KEY_TYPE"
  | "QUOTA_EXCEEDED"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "HTTP_ERROR"
  | "NETWORK_ERROR";

export class KakaoApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code?: KakaoErrorCode,
    readonly kakaoErrorType?: string | null,
    readonly kakaoMessage?: string | null,
  ) {
    super(message);
    this.name = "KakaoApiError";
  }
}

function getApiKey(): string {
  const key = getKakaoRestApiKey();
  if (!key) {
    throw new KakaoApiError(
      "KAKAO_REST_API_KEY가 설정되어 있지 않습니다.",
      503,
      "MISSING_API_KEY",
    );
  }
  return key;
}

export { isKakaoApiConfigured };

type KakaoErrorBody = {
  errorType?: string;
  msg?: string;
  message?: string;
  code?: number | string;
};

function parseKakaoErrorBody(text: string): KakaoErrorBody {
  try {
    const parsed = JSON.parse(text) as KakaoErrorBody;
    return {
      errorType: typeof parsed.errorType === "string" ? parsed.errorType : undefined,
      msg: typeof parsed.msg === "string" ? parsed.msg : undefined,
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      code: parsed.code,
    };
  } catch {
    return {};
  }
}

function classifyForbidden(body: KakaoErrorBody): {
  code: KakaoErrorCode;
  message: string;
} {
  const combined = `${body.errorType ?? ""} ${body.message ?? body.msg ?? ""}`.toLowerCase();

  if (
    combined.includes("open_map_and_local") ||
    combined.includes("local") ||
    combined.includes("disabled")
  ) {
    return {
      code: "LOCAL_API_NOT_ALLOWED",
      message:
        "Kakao Developers 앱에서 카카오맵/로컬(OPEN_MAP_AND_LOCAL) 서비스가 비활성화되어 있습니다. 제품 설정에서 Local API를 활성화한 뒤 다시 시도하세요.",
    };
  }

  if (
    combined.includes("javascript") ||
    combined.includes("admin key") ||
    combined.includes("native")
  ) {
    return {
      code: "INVALID_APP_KEY_TYPE",
      message:
        "앱 키 유형이 올바르지 않을 수 있습니다. Kakao Developers의 REST API 키를 사용하세요. (JavaScript/Native/Admin 키 아님)",
    };
  }

  return {
    code: "FORBIDDEN",
    message: PERMISSION_DENIED_USER_MESSAGE,
  };
}

/**
 * Kakao Local keyword search.
 * Authorization: KakaoAK {KAKAO_REST_API_KEY}
 * 키 원문·Authorization 헤더는 로그하지 않는다.
 */
export async function searchKakaoLocal(
  params: KakaoSearchParams,
): Promise<KakaoLocalSearchResponse> {
  const apiKey = getApiKey();
  const url = new URL(KAKAO_LOCAL_ENDPOINT);
  url.searchParams.set("query", params.query);
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set(
    "size",
    String(Math.min(params.size ?? EXTERNAL_SEARCH_LIMITS.pageSize, 15)),
  );
  url.searchParams.set("sort", params.sort ?? "accuracy");
  if (params.x) url.searchParams.set("x", params.x);
  if (params.y) url.searchParams.set("y", params.y);
  if (params.radius) url.searchParams.set("radius", String(params.radius));

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_SEARCH_LIMITS.timeoutMs,
  );

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new KakaoApiError(
        "Kakao API 인증에 실패했습니다. REST API 키가 맞는지 확인하세요.",
        401,
        "UNAUTHORIZED",
      );
    }

    if (response.status === 403) {
      const text = await response.text();
      const body = parseKakaoErrorBody(text);
      const classified = classifyForbidden(body);
      console.error(
        "[kakao-local] permission denied:",
        body.errorType ?? "unknown",
        body.message ?? body.msg ?? "",
      );
      throw new KakaoApiError(
        classified.message,
        403,
        classified.code,
        body.errorType ?? null,
        body.message ?? body.msg ?? null,
      );
    }

    if (response.status === 429) {
      throw new KakaoApiError(
        "Kakao API 호출 한도(quota)를 초과했습니다. 잠시 후 다시 시도하세요.",
        429,
        "QUOTA_EXCEEDED",
      );
    }

    if (!response.ok) {
      throw new KakaoApiError(
        `Kakao API 요청 실패 (HTTP ${response.status})`,
        response.status,
        "HTTP_ERROR",
      );
    }

    const data = (await response.json()) as KakaoLocalSearchResponse;
    if (!data.meta || !Array.isArray(data.documents)) {
      throw new KakaoApiError(
        "Kakao API 응답 형식이 올바르지 않습니다.",
        502,
        "INVALID_RESPONSE",
      );
    }

    return data;
  } catch (error) {
    if (error instanceof KakaoApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new KakaoApiError(
        `Kakao API 요청 시간 초과 (${EXTERNAL_SEARCH_LIMITS.timeoutMs}ms)`,
        504,
        "TIMEOUT",
      );
    }
    throw new KakaoApiError(
      error instanceof Error ? error.message : "Kakao API 네트워크 오류",
      502,
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
