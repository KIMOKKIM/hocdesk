import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";

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

export class KakaoApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "KakaoApiError";
  }
}

function getApiKey(): string {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) {
    throw new KakaoApiError(
      "KAKAO_REST_API_KEY가 설정되지 않았습니다. .env에 API 키를 입력한 후 개발 서버를 재시작하세요.",
      503,
      "MISSING_API_KEY",
    );
  }
  return key;
}

export function isKakaoApiConfigured(): boolean {
  return Boolean(process.env.KAKAO_REST_API_KEY?.trim());
}

export async function searchKakaoLocal(
  params: KakaoSearchParams,
): Promise<KakaoLocalSearchResponse> {
  const apiKey = getApiKey();
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
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
        "Kakao API 인증에 실패했습니다. KAKAO_REST_API_KEY를 확인하세요.",
        401,
        "UNAUTHORIZED",
      );
    }

    if (response.status === 403) {
      throw new KakaoApiError(
        "Kakao API 권한 오류입니다. REST API 키와 Local API 사용 권한을 확인하세요.",
        403,
        "FORBIDDEN",
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
