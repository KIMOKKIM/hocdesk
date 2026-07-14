import "server-only";

/**
 * Kakao REST API 키는 서버에서만 읽는다.
 * - 정식 변수명: KAKAO_REST_API_KEY
 * - NEXT_PUBLIC_* / KAKAO_API_KEY 는 사용하지 않음
 */

export const KAKAO_REST_API_KEY_ENV = "KAKAO_REST_API_KEY" as const;
export const TARGET_SEARCH_PROVIDER_ENV = "TARGET_SEARCH_PROVIDER" as const;

const DEPRECATED_KAKAO_ENV_NAMES = [
  "KAKAO_API_KEY",
  "NEXT_PUBLIC_KAKAO_REST_API_KEY",
  "NEXT_PUBLIC_KAKAO_API_KEY",
  "KAKAO_JS_KEY",
] as const;

export type KakaoKeyInspection = {
  present: boolean;
  masked: string | null;
  hasWrappingQuotes: boolean;
  hasInternalWhitespace: boolean;
  length: number;
  warnings: string[];
};

function inspectRawKey(raw: string | undefined | null): KakaoKeyInspection {
  if (raw == null) {
    return {
      present: false,
      masked: null,
      hasWrappingQuotes: false,
      hasInternalWhitespace: false,
      length: 0,
      warnings: [],
    };
  }

  const original = String(raw);
  const trimmed = original.trim();
  const hasWrappingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const unquoted = hasWrappingQuotes
    ? trimmed.slice(1, -1).trim()
    : trimmed;
  const hasInternalWhitespace = /\s/.test(unquoted);
  const warnings: string[] = [];

  if (hasWrappingQuotes) {
    warnings.push(
      "환경변수 값에 불필요한 따옴표가 포함되어 있습니다. Vercel에는 따옴표 없이 순수 키만 입력하세요.",
    );
  }
  if (hasInternalWhitespace) {
    warnings.push(
      "API 키 값에 공백 또는 줄바꿈이 포함되어 있습니다. 값을 다시 복사해 주세요.",
    );
  }
  if (original !== trimmed) {
    warnings.push("API 키 값 앞뒤에 공백이 포함되어 있어 자동으로 제거합니다.");
  }

  if (!unquoted) {
    return {
      present: false,
      masked: null,
      hasWrappingQuotes,
      hasInternalWhitespace,
      length: 0,
      warnings,
    };
  }

  return {
    present: true,
    masked: unquoted.length <= 4 ? "****" : `****${unquoted.slice(-4)}`,
    hasWrappingQuotes,
    hasInternalWhitespace,
    length: unquoted.length,
    warnings,
  };
}

/** 실제 API 호출용 키. 따옴표/공백을 정리한 값. 로그·응답에 쓰지 말 것. */
export function getKakaoRestApiKey(): string | null {
  const raw = process.env.KAKAO_REST_API_KEY;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  return unquoted.length > 0 ? unquoted : null;
}

export function inspectKakaoRestApiKey(): KakaoKeyInspection {
  return inspectRawKey(process.env.KAKAO_REST_API_KEY);
}

export function isKakaoApiConfigured(): boolean {
  return getKakaoRestApiKey() !== null;
}

export function maskKakaoApiKey(
  key: string | null = getKakaoRestApiKey(),
): string | null {
  if (!key) return null;
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}

export function getMisconfiguredKakaoEnvHints(): string[] {
  const hints: string[] = [];
  for (const name of DEPRECATED_KAKAO_ENV_NAMES) {
    const value = process.env[name];
    if (value != null && String(value).trim().length > 0) {
      hints.push(
        `${name}이(가) 설정되어 있지만 사용되지 않습니다. ${KAKAO_REST_API_KEY_ENV}를 사용하세요.`,
      );
    }
  }
  hints.push(...inspectKakaoRestApiKey().warnings);
  return hints;
}

export function getKakaoEnvRuntimeMeta() {
  return {
    environment:
      process.env.VERCEL_ENV?.trim() ||
      process.env.NODE_ENV?.trim() ||
      "unknown",
    vercel: Boolean(process.env.VERCEL),
    requiredEnvNames: [TARGET_SEARCH_PROVIDER_ENV, KAKAO_REST_API_KEY_ENV] as string[],
  };
}

export function buildKakaoKeyMissingMessage(
  context: "local" | "vercel" | "auto" = "auto",
): string {
  const isVercel =
    context === "vercel" ||
    (context === "auto" && Boolean(process.env.VERCEL));

  if (isVercel) {
    return (
      `현재 Provider는 KakaoLocalSearchProvider이지만 ${KAKAO_REST_API_KEY_ENV}가 설정되어 있지 않습니다. ` +
      `Vercel Production 환경변수에 ${KAKAO_REST_API_KEY_ENV}를 추가하고 Redeploy 후 다시 시도하세요.`
    );
  }

  return (
    `${KAKAO_REST_API_KEY_ENV}가 설정되어 있지 않습니다. ` +
    `.env에 입력한 뒤 개발 서버를 재시작하세요.`
  );
}

export const PERMISSION_DENIED_USER_MESSAGE =
  "Kakao API가 요청을 거절했습니다. REST API 키가 맞는지, Kakao Developers 앱에서 Local API 사용이 가능한지, Vercel Production 환경변수에 올바른 키가 들어갔는지 확인하세요.";

export type KakaoProviderStatusMessageKind =
  | "demo"
  | "kakao_missing_key"
  | "kakao_ready"
  | "unsupported";

export function resolveKakaoProviderStatusMessage(params: {
  provider: string;
  apiKeyPresent: boolean;
}): { kind: KakaoProviderStatusMessageKind; message: string } {
  const provider = params.provider.trim().toLowerCase();

  if (provider === "demo") {
    return {
      kind: "demo",
      message:
        "현재 데모 검색 Provider입니다. 운영에서는 kakao를 권장합니다.",
    };
  }

  if (provider === "kakao" || provider === "composite") {
    if (!params.apiKeyPresent) {
      return {
        kind: "kakao_missing_key",
        message:
          "KAKAO_REST_API_KEY가 설정되지 않았습니다. Vercel Production 환경변수에 추가 후 Redeploy하세요.",
      };
    }
    return {
      kind: "kakao_ready",
      message:
        "Kakao API 키가 설정되어 있습니다. 연결 테스트를 실행할 수 있습니다.",
    };
  }

  if (provider === "web" || provider === "public") {
    return {
      kind: "unsupported",
      message: `지원하지 않는 TARGET_SEARCH_PROVIDER 값입니다: ${provider}`,
    };
  }

  return {
    kind: "unsupported",
    message: "지원하지 않는 TARGET_SEARCH_PROVIDER 값입니다.",
  };
}
