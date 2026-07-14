import { ApiError } from "@/lib/api/errors";
import type {
  SearchProviderName,
  TargetSearchProvider,
} from "@/lib/collection/types";
import { CompositeSearchProvider } from "@/lib/collection/providers/composite-search-provider";
import { DemoSearchProvider } from "@/lib/collection/providers/demo-search-provider";
import {
  buildKakaoKeyMissingMessage,
  isKakaoApiConfigured,
} from "@/lib/collection/kakao-env";
import { KakaoLocalSearchProvider } from "@/lib/collection/providers/kakao-local-search-provider";
import { PublicDataProvider } from "@/lib/collection/providers/public-data-provider";
import { WebSearchProvider } from "@/lib/collection/providers/web-search-provider";
import {
  assertDemoProviderAllowed,
  isAllowDemoProviderInProduction,
} from "@/lib/demo-filter";

const SUPPORTED_PROVIDERS: SearchProviderName[] = [
  "demo",
  "kakao",
  "composite",
  "web",
  "public",
];

function defaultSearchProvider(): SearchProviderName {
  const env = process.env.TARGET_SEARCH_PROVIDER?.trim().toLowerCase();
  if (env && SUPPORTED_PROVIDERS.includes(env as SearchProviderName)) {
    return env as SearchProviderName;
  }
  return process.env.NODE_ENV === "production" ? "kakao" : "demo";
}

export function resolveSearchProviderName(
  override?: string | null,
): SearchProviderName {
  const raw = (override ?? defaultSearchProvider()).toLowerCase();
  if (!SUPPORTED_PROVIDERS.includes(raw as SearchProviderName)) {
    throw new ApiError(
      `지원하지 않는 TARGET_SEARCH_PROVIDER: "${raw}". demo, kakao, composite 중 하나를 사용하세요.`,
      400,
    );
  }
  return raw as SearchProviderName;
}

export function assertKakaoProviderReady(providerName: SearchProviderName) {
  if (providerName !== "kakao" && providerName !== "composite") return;
  if (isKakaoApiConfigured()) return;
  throw new ApiError(buildKakaoKeyMissingMessage("auto"), 503, "API_KEY_MISSING");
}

export function getTargetSearchProvider(
  override?: string | null,
  jobId?: string,
): TargetSearchProvider {
  const providerName = resolveSearchProviderName(override);

  if (providerName === "demo") {
    try {
      assertDemoProviderAllowed();
    } catch (error) {
      throw new ApiError(
        error instanceof Error
          ? error.message
          : "운영환경에서는 데모 검색을 사용할 수 없습니다. Kakao 실제 업체 검색을 사용하세요.",
        403,
        "DEMO_PROVIDER_BLOCKED",
      );
    }
  }

  switch (providerName) {
    case "web":
      return new WebSearchProvider();
    case "public":
      return new PublicDataProvider();
    case "demo":
      return new DemoSearchProvider();
    case "kakao": {
      assertKakaoProviderReady("kakao");
      const kakao = new KakaoLocalSearchProvider();
      if (jobId) kakao.setJobContext(jobId);
      return kakao;
    }
    case "composite": {
      assertKakaoProviderReady("composite");
      const composite = new CompositeSearchProvider();
      if (jobId) composite.setJobContext(jobId);
      return composite;
    }
    default:
      throw new ApiError(
        `지원하지 않는 TARGET_SEARCH_PROVIDER: "${providerName}".`,
        400,
      );
  }
}

export function getProviderDisplayName(override?: string | null) {
  const provider = resolveSearchProviderName(override);
  switch (provider) {
    case "web":
      return "WebSearchProvider (미구현)";
    case "public":
      return "PublicDataProvider (미구현)";
    case "demo":
      return "DemoSearchProvider";
    case "kakao":
      return "KakaoLocalSearchProvider";
    case "composite":
      return "CompositeSearchProvider";
    default:
      return `알 수 없는 Provider (${provider})`;
  }
}

export function getProviderOptions() {
  const kakaoConfigured = isKakaoApiConfigured();
  const demoAllowed =
    process.env.NODE_ENV !== "production" || isAllowDemoProviderInProduction();

  return [
    {
      value: "kakao" as const,
      label: "카카오 실제 업체 검색",
      description:
        "공개된 지역 사업체 검색 결과를 수집합니다. 이메일과 대표자 정보는 포함되지 않을 수 있으며 관리자 검토가 필요합니다.",
      enabled: kakaoConfigured,
      disabledReason: kakaoConfigured
        ? undefined
        : "KAKAO_REST_API_KEY가 필요합니다.",
    },
    {
      value: "composite" as const,
      label: "복합 검색 (카카오 + DB)",
      description:
        "Kakao 검색 결과와 기존 DB 후보를 병합합니다. 개발 모드에서만 Demo 결과를 소량 포함할 수 있습니다.",
      enabled: kakaoConfigured,
      disabledReason: kakaoConfigured
        ? undefined
        : "KAKAO_REST_API_KEY가 필요합니다.",
    },
    {
      value: "demo" as const,
      label: "데모 검색 (개발용)",
      description: demoAllowed
        ? "기능 검증용 가상 업체를 생성합니다. 운영에서는 사용하지 마세요."
        : "운영환경에서는 데모 검색을 사용할 수 없습니다.",
      enabled: demoAllowed,
      disabledReason: demoAllowed
        ? undefined
        : "운영환경에서는 Kakao 실제 업체 검색을 사용하세요.",
    },
  ];
}

export { isKakaoApiConfigured };
