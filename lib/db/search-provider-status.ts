import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";
import {
  getProviderDisplayName,
  isKakaoApiConfigured,
  resolveSearchProviderName,
} from "@/lib/collection/providers";
import { prisma } from "@/lib/prisma";

const STATUS_KEY = "search_provider_status";

type StoredProviderStatus = {
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  quotaStatus?: string | null;
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

export async function getSearchProviderStatus() {
  let provider = "demo";
  let providerLabel = "DemoSearchProvider";
  try {
    provider = resolveSearchProviderName();
    providerLabel = getProviderDisplayName();
  } catch {
    provider = process.env.TARGET_SEARCH_PROVIDER ?? "demo";
    providerLabel = `알 수 없음 (${provider})`;
  }
  const stored = await getStoredProviderStatus();
  const kakaoConfigured = isKakaoApiConfigured();

  return {
    provider,
    providerLabel,
    configured: provider === "demo" ? true : kakaoConfigured,
    apiKeyPresent: kakaoConfigured,
    lastSuccessAt: stored.lastSuccessAt ?? null,
    lastErrorAt: stored.lastErrorAt ?? null,
    lastErrorMessage: stored.lastErrorMessage ?? null,
    quotaStatus: stored.quotaStatus ?? null,
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
        enabled: kakaoConfigured,
      },
      {
        value: "composite",
        label: "복합 검색",
        enabled: kakaoConfigured,
      },
    ],
  };
}
