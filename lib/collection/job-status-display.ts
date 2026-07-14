/**
 * TargetCollectionJob 진행상태를 사람이 읽을 수 있는 표시로 변환 (클라이언트·서버 공용)
 */
import { CollectionJobStatus } from "@/lib/constants/status";
import {
  CollectionProgressStep,
  formatElapsed,
  stalledProgressWarning,
} from "@/lib/collection/progress-shared";

export type JobStatusDisplayInput = {
  status: string;
  currentStep?: string | null;
  currentQuery?: string | null;
  processedQueries?: number | null;
  totalQueries?: number | null;
  apiCallCount?: number | null;
  rawResultCount?: number | null;
  collectedCount?: number | null;
  acceptedCount?: number | null;
  duplicateCount?: number | null;
  rejectedCount?: number | null;
  reviewRequiredCount?: number | null;
  lastProgressAt?: string | Date | null;
  startedAt?: string | Date | null;
  startedAtIso?: string | null;
  completedAt?: string | Date | null;
  errorMessage?: string | null;
  lastMessage?: string | null;
  jobStats?: unknown;
  dryRun?: boolean;
};

export type JobStatusSeverity = "info" | "success" | "warning" | "danger" | "muted";

export type JobStatusDisplay = {
  label: string;
  description: string;
  severity: JobStatusSeverity;
  isStale: boolean;
  isSearching: boolean;
  isNoResult: boolean;
  isSaving: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  elapsedText: string;
  staleWarning: string | null;
  vercelTimeoutHint: string | null;
};

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function statsField(jobStats: unknown, key: string): number | null {
  if (!jobStats || typeof jobStats !== "object") return null;
  const value = (jobStats as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

/** top-level 값을 우선하고, 없으면 jobStats에서 보완 */
export function resolveProgressCounts(input: JobStatusDisplayInput) {
  const stats = input.jobStats;
  return {
    apiCallCount: num(input.apiCallCount) || num(statsField(stats, "apiCallCount")),
    rawResultCount: num(input.rawResultCount) || num(statsField(stats, "rawResultCount")),
    collectedCount: num(input.collectedCount),
    acceptedCount: num(input.acceptedCount),
    duplicateCount: num(input.duplicateCount),
    rejectedCount: num(input.rejectedCount),
    reviewRequiredCount: num(input.reviewRequiredCount),
    processedQueries: num(input.processedQueries),
    totalQueries: num(input.totalQueries) || num(statsField(stats, "queryCount")),
  };
}

function isDryRunJob(input: JobStatusDisplayInput): boolean {
  if (input.dryRun) return true;
  if (input.status === CollectionJobStatus.DRY_RUN) return true;
  if (input.jobStats && typeof input.jobStats === "object") {
    return (input.jobStats as { dryRun?: boolean }).dryRun === true;
  }
  return false;
}

function vercelTimeoutHint(
  status: string,
  startedAt: string | Date | null | undefined,
): string | null {
  if (
    status !== CollectionJobStatus.RUNNING &&
    status !== CollectionJobStatus.QUEUED &&
    status !== CollectionJobStatus.CANCEL_REQUESTED
  ) {
    return null;
  }
  if (!startedAt) return null;
  const start =
    typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  if (Number.isNaN(start.getTime())) return null;
  if (Date.now() - start.getTime() < 90_000) return null;
  return "운영환경에서는 긴 수집 작업이 제한될 수 있습니다. 요청 수를 줄이거나 검색어를 나누어 실행하세요.";
}

export function buildJobStatusDisplay(
  input: JobStatusDisplayInput,
): JobStatusDisplay {
  const counts = resolveProgressCounts(input);
  const started =
    input.startedAtIso ?? input.startedAt ?? null;
  const elapsedText = formatElapsed(started);
  const staleWarning = stalledProgressWarning(
    input.lastProgressAt,
    input.status,
  );
  const isStale = Boolean(staleWarning);
  const dryRun = isDryRunJob(input);

  const base = {
    isStale,
    isSearching: false,
    isNoResult: false,
    isSaving: false,
    isCompleted: false,
    isFailed: false,
    elapsedText,
    staleWarning,
    vercelTimeoutHint: vercelTimeoutHint(input.status, started),
  };

  if (input.status === CollectionJobStatus.FAILED) {
    return {
      ...base,
      label: "수집 실패",
      description: input.errorMessage
        ? `수집 실패: ${input.errorMessage}`
        : "수집 실패: 알 수 없는 오류가 발생했습니다.",
      severity: "danger",
      isFailed: true,
    };
  }

  if (input.status === CollectionJobStatus.CANCELLED) {
    return {
      ...base,
      label: "취소됨",
      description: "수집 작업이 취소되었습니다.",
      severity: "muted",
      isCompleted: true,
    };
  }

  if (
    input.status === CollectionJobStatus.COMPLETED ||
    input.status === CollectionJobStatus.DRY_RUN
  ) {
    return {
      ...base,
      ...completedDisplay(counts, dryRun, input.lastMessage),
      isCompleted: true,
    };
  }

  if (input.status === CollectionJobStatus.QUEUED) {
    return {
      ...base,
      label: "대기 중",
      description: "수집 작업이 대기열에 등록되어 곧 시작됩니다.",
      severity: "info",
    };
  }

  if (input.status === CollectionJobStatus.CANCEL_REQUESTED) {
    return {
      ...base,
      label: "취소 요청됨",
      description: "취소 요청을 처리하는 중입니다.",
      severity: "warning",
    };
  }

  // RUNNING
  const step = input.currentStep ?? "";
  const isSavingStep =
    step === CollectionProgressStep.SAVING_CANDIDATES ||
    step === CollectionProgressStep.SAVING_COMPANIES ||
    step === CollectionProgressStep.AGGREGATING;
  const isSearchStep =
    step === CollectionProgressStep.CALLING_API ||
    step === CollectionProgressStep.SEARCH_READY ||
    step.includes("Kakao") ||
    counts.apiCallCount > 0;

  if (isSavingStep) {
    return {
      ...base,
      label: step || "저장 중",
      description:
        input.currentQuery
          ? `저장 중 · 검색어 ${input.currentQuery} · 신규 ${counts.acceptedCount}`
          : `후보 저장/등록 중 · 신규 ${counts.acceptedCount} · 중복 ${counts.duplicateCount}`,
      severity: "info",
      isSaving: true,
    };
  }

  if (
    counts.processedQueries > 0 &&
    counts.totalQueries > 0 &&
    counts.processedQueries >= counts.totalQueries &&
    counts.rawResultCount === 0
  ) {
    return {
      ...base,
      label: "결과 집계 중",
      description:
        "검색어 처리는 끝났지만 아직 집계가 완료되지 않았습니다. 잠시만 기다려 주세요.",
      severity: "warning",
      isSearching: true,
      isNoResult: true,
    };
  }

  if (counts.processedQueries > 0 && counts.rawResultCount === 0) {
    return {
      ...base,
      label: step || "Kakao API 검색 진행 중",
      description: [
        "검색은 진행 중이나 아직 원본 결과가 없습니다.",
        input.currentQuery ? `현재 검색어: ${input.currentQuery}` : null,
        counts.totalQueries > 0
          ? `진행 ${counts.processedQueries}/${counts.totalQueries}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      severity: "warning",
      isSearching: true,
      isNoResult: true,
    };
  }

  if (isSearchStep || counts.apiCallCount > 0) {
    return {
      ...base,
      label: step || "Kakao API 검색 진행 중",
      description: [
        input.currentQuery ? `현재 검색어: ${input.currentQuery}` : null,
        counts.totalQueries > 0
          ? `검색어 ${counts.processedQueries}/${counts.totalQueries}`
          : null,
        `API ${counts.apiCallCount}회`,
        `원본 ${counts.rawResultCount}건`,
      ]
        .filter(Boolean)
        .join(" · "),
      severity: "info",
      isSearching: true,
    };
  }

  if (step) {
    return {
      ...base,
      label: step,
      description: [
        input.currentQuery ? `현재 검색어: ${input.currentQuery}` : null,
        input.lastMessage,
        counts.totalQueries > 0
          ? `${counts.processedQueries}/${counts.totalQueries}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "수집 작업을 진행하고 있습니다.",
      severity: "info",
      isSearching: true,
    };
  }

  return {
    ...base,
    label: "수집 진행 중",
    description: input.lastMessage ?? "수집 작업이 실행 중입니다.",
    severity: "info",
    isSearching: true,
  };
}

function completedDisplay(
  counts: ReturnType<typeof resolveProgressCounts>,
  dryRun: boolean,
  lastMessage?: string | null,
): Pick<JobStatusDisplay, "label" | "description" | "severity" | "isNoResult"> {
  if (dryRun && counts.acceptedCount === 0 && counts.rawResultCount > 0) {
    return {
      label: "미리보기 완료",
      description:
        "미리보기 모드로 검색 후보만 생성되었습니다. 후보 목록에서 선택 등록하세요.",
      severity: "success",
      isNoResult: false,
    };
  }

  if (dryRun) {
    return {
      label: "미리보기 완료",
      description:
        lastMessage ??
        (counts.acceptedCount > 0
          ? `미리보기 완료: 후보 ${counts.acceptedCount}건`
          : "미리보기가 완료되었습니다."),
      severity: "success",
      isNoResult: counts.rawResultCount === 0 && counts.acceptedCount === 0,
    };
  }

  if (counts.rawResultCount === 0 && counts.acceptedCount === 0) {
    return {
      label: "검색 완료: 결과 없음",
      description:
        "검색은 완료되었지만 Kakao에서 해당 조건의 업체를 찾지 못했습니다.",
      severity: "warning",
      isNoResult: true,
    };
  }

  if (
    counts.acceptedCount === 0 &&
    counts.duplicateCount > 0 &&
    counts.rejectedCount === 0
  ) {
    return {
      label: "검색 완료: 신규 없음",
      description: "신규 업체는 없고 기존 등록 업체와 중복되었습니다.",
      severity: "warning",
      isNoResult: true,
    };
  }

  if (counts.acceptedCount === 0 && counts.duplicateCount > 0) {
    return {
      label: "검색 완료: 신규 업체 없음, 기존 업체와 중복",
      description: `신규 0 · 중복 ${counts.duplicateCount} · 제외 ${counts.rejectedCount}`,
      severity: "warning",
      isNoResult: true,
    };
  }

  if (
    counts.acceptedCount === 0 &&
    counts.rejectedCount > 0 &&
    counts.rawResultCount > 0
  ) {
    return {
      label: "검색 완료: 조건에 맞는 업체 없음",
      description:
        "검색 결과는 있었지만 업종 적합성 검증에서 모두 제외되었습니다.",
      severity: "warning",
      isNoResult: true,
    };
  }

  if (counts.acceptedCount === 0 && counts.rejectedCount > 0) {
    return {
      label: "검색 완료: 조건에 맞는 업체 없음",
      description: `제외 ${counts.rejectedCount}건 · 신규 등록 0건`,
      severity: "warning",
      isNoResult: true,
    };
  }

  if (counts.acceptedCount > 0) {
    return {
      label: `수집 완료: 신규 ${counts.acceptedCount}곳 등록`,
      description: `신규 ${counts.acceptedCount} · 중복 ${counts.duplicateCount} · 제외 ${counts.rejectedCount}`,
      severity: "success",
      isNoResult: false,
    };
  }

  return {
    label: "수집 완료",
    description: lastMessage ?? "수집 작업이 완료되었습니다.",
    severity: "success",
    isNoResult: false,
  };
}
