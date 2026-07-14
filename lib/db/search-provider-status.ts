import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";
import {
  buildKakaoKeyMissingMessage,
  getKakaoEnvRuntimeMeta,
  getMisconfiguredKakaoEnvHints,
  isKakaoApiConfigured,
  maskKakaoApiKey,
  resolveKakaoProviderStatusMessage,
} from "@/lib/collection/kakao-env";
import {
  getProviderDisplayName,
  resolveSearchProviderName,
} from "@/lib/collection/providers";
import { KAKAO_LOCAL_ENDPOINT } from "@/lib/projects/jinwoong-sale-content";
import { prisma } from "@/lib/prisma";

const STATUS_KEY = "search_provider_status";

type StoredProviderStatus = {
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  lastProvider?: string | null;
  quotaStatus?: string | null;
  lastTestAt?: string | null;
  lastTestSuccess?: boolean | null;
  lastTestErrorCode?: string | null;
  lastTestMessage?: string | null;
};

export async function getStoredProviderStatus(): Promise<StoredProviderStatus> {
  const row = await prisma.appSetting.findUnique({ where: { key: STATUS_KEY } });
  if (!row?.value || typeof row.value !== "object") return {};
  return row.value as StoredProviderStatus;
}

export async function recordProviderSuccess(provider: string) {
  const current = await getStoredProviderStatus();
  await prisma.appSetting.upsert({
    where: { key: STATUS_KEY },
    create: {
      key: STATUS_KEY,
      value: {
        ...current,
        lastSuccessAt: new Date().toISOString(),
        lastProvider: provider,
      },
    },
    update: {
      value: {
        ...current,
        lastSuccessAt: new Date().toISOString(),
        lastProvider: provider,
      },
    },
  });
}

export async function recordProviderError(
  provider: string,
  message: string,
  quotaStatus?: string | null,
) {
  const current = await getStoredProviderStatus();
  await prisma.appSetting.upsert({
    where: { key: STATUS_KEY },
    create: {
      key: STATUS_KEY,
      value: {
        ...current,
        lastErrorAt: new Date().toISOString(),
        lastErrorMessage: message,
        lastProvider: provider,
        quotaStatus: quotaStatus ?? null,
      },
    },
    update: {
      value: {
        ...current,
        lastErrorAt: new Date().toISOString(),
        lastErrorMessage: message,
        lastProvider: provider,
        quotaStatus: quotaStatus ?? null,
      },
    },
  });
}

export async function recordKakaoConnectionTest(params: {
  success: boolean;
  errorCode?: string | null;
  message?: string | null;
}) {
  const current = await getStoredProviderStatus();
  const now = new Date().toISOString();
  const next: StoredProviderStatus = {
    ...current,
    lastTestAt: now,
    lastTestSuccess: params.success,
    lastTestErrorCode: params.success ? null : params.errorCode ?? null,
    lastTestMessage: params.message ?? null,
    lastProvider: "kakao",
  };

  if (params.success) {
    next.lastSuccessAt = now;
  } else {
    next.lastErrorAt = now;
    next.lastErrorMessage = params.message ?? null;
  }

  await prisma.appSetting.upsert({
    where: { key: STATUS_KEY },
    create: { key: STATUS_KEY, value: next },
    update: { value: next },
  });
}

export async function hasBlockingKakaoPermissionError(): Promise<boolean> {
  const stored = await getStoredProviderStatus();
  if (stored.lastTestSuccess === true) return false;
  const code = stored.lastTestErrorCode ?? "";
  return (
    code === "PERMISSION_DENIED" ||
    code === "LOCAL_API_NOT_ALLOWED" ||
    code === "INVALID_APP_KEY_TYPE" ||
    code === "AUTHENTICATION_FAILED"
  );
}

export async function getSearchProviderStatus() {
  let provider = "demo";
  let providerName = "DemoSearchProvider";
  let providerValid = true;

  try {
    provider = resolveSearchProviderName();
    providerName = getProviderDisplayName();
  } catch {
    provider =
      (process.env.TARGET_SEARCH_PROVIDER ?? "unknown").trim() || "unknown";
    providerName = `알 수 없음 (${provider})`;
    providerValid = false;
  }

  const stored = await getStoredProviderStatus();
  const apiKeyPresent = isKakaoApiConfigured();
  const apiKeyMasked = maskKakaoApiKey();
  const runtime = getKakaoEnvRuntimeMeta();
  const misconfiguredHints = getMisconfiguredKakaoEnvHints();

  const needsKakaoKey = provider === "kakao" || provider === "composite";
  const providerConfigured =
    provider === "demo"
      ? true
      : needsKakaoKey
        ? apiKeyPresent
        : providerValid;

  const statusMessage = providerValid
    ? resolveKakaoProviderStatusMessage({ provider, apiKeyPresent })
    : {
        kind: "unsupported" as const,
        message: "지원하지 않는 TARGET_SEARCH_PROVIDER 값입니다.",
      };

  let message = statusMessage.message;
  if (!apiKeyPresent && needsKakaoKey) {
    message = buildKakaoKeyMissingMessage("auto");
  } else if (apiKeyPresent && needsKakaoKey) {
    message = "Kakao API 키가 설정되어 있습니다.";
  }

  return {
    provider,
    providerName,
    providerLabel: providerName,
    configured: providerConfigured,
    providerConfigured,
    apiKeyPresent,
    apiKeyMasked,
    targetSearchProvider: provider,
    endpointReady: apiKeyPresent,
    endpoint: KAKAO_LOCAL_ENDPOINT,
    lastSuccessAt: stored.lastSuccessAt ?? null,
    lastErrorAt: stored.lastErrorAt ?? null,
    lastErrorMessage: stored.lastErrorMessage ?? null,
    lastTestAt: stored.lastTestAt ?? null,
    lastTestSuccess: stored.lastTestSuccess ?? null,
    lastTestErrorCode: stored.lastTestErrorCode ?? null,
    lastTestMessage: stored.lastTestMessage ?? null,
    quotaStatus: stored.quotaStatus ?? null,
    message,
    statusKind: statusMessage.kind,
    misconfiguredHints,
    environment: runtime.environment,
    vercel: runtime.vercel,
    requiredEnvNames: runtime.requiredEnvNames,
    limits: {
      dailyNewCompanies: COLLECTION_LIMITS.maxNewCompaniesPerDay,
      maxPendingReview: COLLECTION_LIMITS.maxPendingReview,
      maxQueriesPerJob: EXTERNAL_SEARCH_LIMITS.maxQueriesPerJob,
      maxRawResultsPerJob: EXTERNAL_SEARCH_LIMITS.maxRawResultsPerJob,
      repeatSearchWaitDays: COLLECTION_LIMITS.repeatSearchWaitDays,
    },
    options: [
      {
        value: "demo",
        label: "데모 검색",
        enabled: true,
      },
      {
        value: "kakao",
        label: "카카오 실제 업체 검색",
        enabled: apiKeyPresent,
      },
      {
        value: "composite",
        label: "복합 검색",
        enabled: apiKeyPresent,
      },
    ],
  };
}
