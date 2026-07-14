/**
 * 클라이언트 오케스트레이션용 검색어 단위 수집
 * prepare → run-next(1 query) → COMPLETED
 */
import { EXTERNAL_SEARCH_LIMITS } from "@/lib/config/external-search-limits";
import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import {
  buildInitialSearchPlan,
  CollectionJobType,
} from "@/lib/constants/collection";
import { processCollectionCandidate } from "@/lib/collection/candidate-pipeline";
import { enrichSearchPlanWithKakaoQueries } from "@/lib/collection/kakao-search-queries";
import { searchKakaoSingleQuery } from "@/lib/collection/kakao-single-query";
import { collectionAudit, collectionError, collectionLog } from "@/lib/collection/logger";
import {
  assertKakaoProviderReady,
  resolveSearchProviderName,
} from "@/lib/collection/providers";
import { KakaoApiError } from "@/lib/collection/providers/kakao-local-client";
import {
  CollectionProgressStep,
  updateJobProgress,
} from "@/lib/collection/progress";
import type { KakaoSearchQuery, SearchCandidate, SearchPlan } from "@/lib/collection/types";
import { ApiError } from "@/lib/api/errors";
import {
  getActiveInitialJob,
  getCompletedInitialJob,
} from "@/lib/collection/limits";
import { hasBlockingKakaoPermissionError } from "@/lib/db/search-provider-status";
import { applyTargetFit } from "@/lib/scoring/calculate-target-fit";
import { CollectionJobStatus } from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";
import { normalizeCandidateBase } from "@/lib/collection/providers/demo-search-provider";
import { normalizePhone, normalizeAddress } from "@/lib/format";

export type PrepareCollectionResult = {
  jobId: string;
  status: string;
  totalQueries: number;
  mode: "preview";
  requestedCount: number;
  provider: string;
};

export type RunNextResult = {
  jobId: string;
  status: string;
  currentQuery: string | null;
  processedQueries: number;
  totalQueries: number;
  remainingQueries: number;
  rawResultCount: number;
  candidatesCreated: number;
  stepCandidatesCreated: number;
  acceptedCount: number;
  reviewRequiredCount: number;
  rejectedCount: number;
  duplicateCount: number;
  apiCallCount: number;
  lastMessage: string | null;
  queryError?: string | null;
  done: boolean;
};

function getQueries(searchPlan: SearchPlan): KakaoSearchQuery[] {
  const queries = (searchPlan.generatedQueries ?? []).slice(
    0,
    EXTERNAL_SEARCH_LIMITS.maxQueriesPerJob,
  );
  return queries;
}

/**
 * 검색 계획 + QUEUED job만 생성. Kakao 호출 없음.
 */
export async function prepareCollectionJob(options: {
  projectId: string;
  provider?: string;
  requestedCount?: number;
  confirmed?: boolean;
  force?: boolean;
}): Promise<PrepareCollectionResult> {
  const {
    projectId,
    requestedCount = 30,
    confirmed = false,
    force = false,
  } = options;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error("프로젝트를 찾을 수 없습니다.");
  }

  const activeJob = await getActiveInitialJob(projectId);
  if (activeJob) {
    throw new Error(
      "이미 실행 중이거나 일시정지된 수집 작업이 있습니다. 이어서 실행하거나 정리 후 다시 시도하세요.",
    );
  }

  const completedJob = await getCompletedInitialJob(projectId);
  if (completedJob && !force && !confirmed) {
    // 재검색 허용: confirmed로 재실행
  }

  const providerName = resolveSearchProviderName(options.provider ?? "kakao");
  if (providerName === "demo") {
    throw new ApiError(
      "운영 수집은 Kakao 실제 검색만 지원합니다.",
      400,
      "DEMO_PROVIDER_BLOCKED",
    );
  }

  assertKakaoProviderReady(providerName);
  if (await hasBlockingKakaoPermissionError()) {
    throw new ApiError(
      "Kakao 연결 테스트가 실패한 상태입니다. Settings에서 연결 테스트를 먼저 통과하세요.",
      403,
      "KAKAO_PERMISSION_BLOCKED",
    );
  }

  const boundedRequest = Math.min(
    requestedCount,
    COLLECTION_LIMITS.maxInitialCandidates,
  );

  let searchPlan: SearchPlan = buildInitialSearchPlan(projectId, boundedRequest);
  searchPlan = enrichSearchPlanWithKakaoQueries(searchPlan, providerName);
  const queries = getQueries(searchPlan);
  searchPlan = {
    ...searchPlan,
    generatedQueries: queries,
    queryCount: queries.length,
    dryRun: true,
    importMode: "review",
    provider: providerName,
    orchestration: "client-step",
  };

  if (queries.length === 0) {
    throw new Error("검색어가 생성되지 않았습니다.");
  }

  const job = await prisma.targetCollectionJob.create({
    data: {
      projectId,
      jobType: CollectionJobType.INITIAL,
      status: CollectionJobStatus.QUEUED,
      searchPlan,
      requestedCount: boundedRequest,
      progressPercent: 0,
      currentStep: CollectionProgressStep.PREPARING,
      processedQueries: 0,
      totalQueries: queries.length,
      lastMessage: `검색 계획 준비 완료. 검색어 ${queries.length}개를 순차 실행합니다.`,
      lastProgressAt: new Date(),
    },
  });

  collectionLog(job.id, "prepare 완료", {
    totalQueries: queries.length,
    provider: providerName,
  });

  return {
    jobId: job.id,
    status: CollectionJobStatus.QUEUED,
    totalQueries: queries.length,
    mode: "preview",
    requestedCount: boundedRequest,
    provider: providerName,
  };
}

/**
 * 다음 검색어 1개만 처리하고 SearchCandidate에 저장.
 */
export async function runNextCollectionQuery(
  jobId: string,
): Promise<RunNextResult> {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) {
    throw new Error("수집 작업을 찾을 수 없습니다.");
  }

  if (
    job.status === CollectionJobStatus.COMPLETED ||
    job.status === CollectionJobStatus.DRY_RUN ||
    job.status === CollectionJobStatus.CANCELLED ||
    job.status === CollectionJobStatus.FAILED
  ) {
    return {
      jobId,
      status: job.status,
      currentQuery: job.currentQuery,
      processedQueries: job.processedQueries,
      totalQueries: job.totalQueries,
      remainingQueries: Math.max(0, job.totalQueries - job.processedQueries),
      rawResultCount: job.rawResultCount,
      candidatesCreated: job.acceptedCount,
      stepCandidatesCreated: 0,
      acceptedCount: job.acceptedCount,
      reviewRequiredCount: job.reviewRequiredCount,
      rejectedCount: job.rejectedCount,
      duplicateCount: job.duplicateCount,
      apiCallCount: job.apiCallCount,
      lastMessage: job.lastMessage,
      done: true,
    };
  }

  if (job.status === CollectionJobStatus.CANCEL_REQUESTED) {
    await updateJobProgress(jobId, {
      status: CollectionJobStatus.CANCELLED,
      currentStep: CollectionProgressStep.CANCELLED,
      completedAt: new Date(),
      lastMessage: "수집 작업이 취소되었습니다.",
    });
    return {
      jobId,
      status: CollectionJobStatus.CANCELLED,
      currentQuery: job.currentQuery,
      processedQueries: job.processedQueries,
      totalQueries: job.totalQueries,
      remainingQueries: 0,
      rawResultCount: job.rawResultCount,
      candidatesCreated: job.acceptedCount,
      stepCandidatesCreated: 0,
      acceptedCount: job.acceptedCount,
      reviewRequiredCount: job.reviewRequiredCount,
      rejectedCount: job.rejectedCount,
      duplicateCount: job.duplicateCount,
      apiCallCount: job.apiCallCount,
      lastMessage: "수집 작업이 취소되었습니다.",
      done: true,
    };
  }

  const searchPlan = job.searchPlan as SearchPlan;
  const queries = getQueries(searchPlan);
  const totalQueries = queries.length || job.totalQueries;
  const index = job.processedQueries;

  if (index >= totalQueries || queries.length === 0) {
    return finalizeStepJob(jobId, job, searchPlan, "모든 검색어 처리가 완료되었습니다.");
  }

  const queryItem = queries[index]!;
  const project = await prisma.project.findUnique({
    where: { id: job.projectId },
    select: { location: true, askingPrice: true },
  });

  if (
    job.status === CollectionJobStatus.QUEUED ||
    job.status === CollectionJobStatus.PAUSED
  ) {
    await updateJobProgress(jobId, {
      status: CollectionJobStatus.RUNNING,
      startedAt: job.startedAt ?? new Date(),
      currentStep: CollectionProgressStep.CALLING_API,
      currentQuery: queryItem.query,
      totalQueries,
      lastMessage: `검색어 처리 중: ${queryItem.query}`,
    });
  } else {
    await updateJobProgress(jobId, {
      status: CollectionJobStatus.RUNNING,
      currentStep: CollectionProgressStep.CALLING_API,
      currentQuery: queryItem.query,
      lastMessage: `검색어 처리 중: ${queryItem.query}`,
    });
  }

  let stepCandidatesCreated = 0;
  let stepAccepted = 0;
  let stepReview = 0;
  let stepRejected = 0;
  let stepDuplicate = 0;
  let stepRaw = 0;
  let stepApi = 0;
  let queryError: string | null = null;

  // 이미 저장된 externalId (job 단위 중복 방지)
  const existing = await prisma.discoveredCandidate.findMany({
    where: { collectionJobId: jobId, externalId: { not: null } },
    select: { externalId: true },
  });
  const seen = new Set(
    existing.map((e) => e.externalId!).filter(Boolean),
  );

  try {
    const result = await searchKakaoSingleQuery(queryItem, {
      seenExternalIds: seen,
    });
    stepRaw = result.queryRawCount;
    stepApi = result.apiCallCount;
    stepRejected += result.industryRejected;

    collectionAudit(jobId, "EXTERNAL_SEARCH_QUERY_COMPLETED", {
      query: queryItem.query,
      resultCount: result.queryRawCount,
      segment: queryItem.segment,
    });

    for (const raw of result.candidates) {
      const normalized = normalizeCandidateBase(raw);
      let candidate: SearchCandidate = {
        ...normalized,
        mainPhone: raw.mainPhone ? normalizePhone(raw.mainPhone) : null,
        normalizedAddress: raw.address
          ? normalizeAddress(raw.address)
          : raw.normalizedAddress ?? null,
        industryValidation: raw.industryValidation,
        sourceConfidence: raw.sourceConfidence,
        rawMetadata: raw.rawMetadata,
        isDemo: false,
      };

      candidate = applyTargetFit(candidate, {
        projectLocation: project?.location,
        askingPrice: project?.askingPrice,
      });

      if (candidate.targetGrade === "EXCLUDED") {
        stepRejected += 1;
        continue;
      }

      const processResult = await processCollectionCandidate({
        candidate,
        projectId: job.projectId,
        jobId,
        isExternal: true,
        dryRun: true,
        importMode: "review",
      });

      if (processResult.action === "duplicate") {
        stepDuplicate += 1;
        continue;
      }
      if (processResult.action === "rejected") {
        stepRejected += 1;
        continue;
      }
      if (processResult.action === "queued") {
        stepCandidatesCreated += 1;
        if (candidate.industryValidation === "REVIEW") {
          stepReview += 1;
        } else {
          stepAccepted += 1;
        }
      }
    }
  } catch (error) {
    queryError =
      error instanceof KakaoApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "검색어 처리 실패";
    collectionError(jobId, `검색어 실패: ${queryItem.query}`, error);
    // 해당 검색어만 건너뛰고 계속 진행
    stepRejected += 1;
  }

  const processedQueries = index + 1;
  const acceptedCount = job.acceptedCount + stepAccepted + stepReview;
  // acceptedCount on job = candidates saved (ACCEPT+REVIEW)
  const duplicateCount = job.duplicateCount + stepDuplicate;
  const rejectedCount = job.rejectedCount + stepRejected;
  const reviewRequiredCount = job.reviewRequiredCount + stepReview;
  const rawResultCount = job.rawResultCount + stepRaw;
  const apiCallCount = job.apiCallCount + stepApi;
  const progressPercent = Math.min(
    99,
    Math.round((processedQueries / Math.max(1, totalQueries)) * 100),
  );

  const stepMessage = queryError
    ? `검색어 "${queryItem.query}" 오류: ${queryError} — 다음 검색어로 진행합니다.`
    : stepRaw === 0
      ? `Kakao에서 결과 0건: ${queryItem.query}`
      : stepCandidatesCreated === 0 && stepRejected > 0
        ? `결과는 있었으나 업종 검증에서 제외: ${queryItem.query}`
        : stepCandidatesCreated === 0 && stepDuplicate > 0
          ? `기존 업체와 중복되어 신규 등록 없음: ${queryItem.query}`
          : `검색어 "${queryItem.query}" 완료 — 후보 ${stepCandidatesCreated}건 저장`;

  if (processedQueries >= totalQueries) {
    const finalMessage =
      acceptedCount > 0
        ? `검색 후보 ${acceptedCount}건이 생성되었습니다. 검색 후보 화면에서 승인하면 타깃 업체에 등록됩니다.`
        : rawResultCount === 0
          ? "Kakao에서 검색 결과를 찾지 못했습니다."
          : rejectedCount > 0 && duplicateCount === 0
            ? "검색 결과는 있었지만 업종 검증에서 제외되었습니다."
            : duplicateCount > 0
              ? "기존 업체와 중복되어 신규 후보가 없습니다."
              : "검색이 완료되었지만 저장할 후보가 없습니다.";

    await updateJobProgress(jobId, {
      status: CollectionJobStatus.COMPLETED,
      currentStep: CollectionProgressStep.COMPLETED,
      progressPercent: 100,
      processedQueries,
      totalQueries,
      currentQuery: queryItem.query,
      collectedCount: acceptedCount + duplicateCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      reviewRequiredCount,
      rawResultCount,
      apiCallCount,
      completedAt: new Date(),
      lastMessage: finalMessage,
      jobStats: {
        provider: "kakao",
        dryRun: true,
        importMode: "review",
        orchestration: "client-step",
        queryCount: totalQueries,
        apiCallCount,
        rawResultCount,
        candidatesCreated: acceptedCount,
        companiesImported: 0,
        acceptedCount,
        rejectedCount,
        duplicateCount,
        industryAccepted: 0,
        industryReview: reviewRequiredCount,
        industryRejected: rejectedCount,
        withPhone: 0,
        withoutWebsite: 0,
        withoutEmail: 0,
        segmentBreakdown: [],
      },
    });

    return {
      jobId,
      status: CollectionJobStatus.COMPLETED,
      currentQuery: queryItem.query,
      processedQueries,
      totalQueries,
      remainingQueries: 0,
      rawResultCount,
      candidatesCreated: acceptedCount,
      stepCandidatesCreated,
      acceptedCount,
      reviewRequiredCount,
      rejectedCount,
      duplicateCount,
      apiCallCount,
      lastMessage: finalMessage,
      queryError,
      done: true,
    };
  }

  await updateJobProgress(jobId, {
    status: CollectionJobStatus.RUNNING,
    currentStep: CollectionProgressStep.CALLING_API,
    progressPercent,
    processedQueries,
    totalQueries,
    currentQuery: queryItem.query,
    collectedCount: acceptedCount + duplicateCount,
    acceptedCount,
    duplicateCount,
    rejectedCount,
    reviewRequiredCount,
    rawResultCount,
    apiCallCount,
    lastMessage: stepMessage,
  });

  return {
    jobId,
    status: CollectionJobStatus.RUNNING,
    currentQuery: queryItem.query,
    processedQueries,
    totalQueries,
    remainingQueries: Math.max(0, totalQueries - processedQueries),
    rawResultCount,
    candidatesCreated: acceptedCount,
    stepCandidatesCreated,
    acceptedCount,
    reviewRequiredCount,
    rejectedCount,
    duplicateCount,
    apiCallCount,
    lastMessage: stepMessage,
    queryError,
    done: false,
  };
}

async function finalizeStepJob(
  jobId: string,
  job: {
    acceptedCount: number;
    duplicateCount: number;
    rejectedCount: number;
    reviewRequiredCount: number;
    rawResultCount: number;
    apiCallCount: number;
    processedQueries: number;
    totalQueries: number;
    currentQuery: string | null;
  },
  searchPlan: SearchPlan,
  message: string,
): Promise<RunNextResult> {
  const finalMessage =
    job.acceptedCount > 0
      ? `검색 후보 ${job.acceptedCount}건이 생성되었습니다. 검색 후보 화면에서 승인하면 타깃 업체에 등록됩니다.`
      : message;

  await updateJobProgress(jobId, {
    status: CollectionJobStatus.COMPLETED,
    currentStep: CollectionProgressStep.COMPLETED,
    progressPercent: 100,
    completedAt: new Date(),
    lastMessage: finalMessage,
    jobStats: {
      provider: searchPlan.provider ?? "kakao",
      dryRun: true,
      importMode: "review",
      orchestration: "client-step",
      queryCount: job.totalQueries,
      apiCallCount: job.apiCallCount,
      rawResultCount: job.rawResultCount,
      candidatesCreated: job.acceptedCount,
      companiesImported: 0,
      acceptedCount: job.acceptedCount,
      rejectedCount: job.rejectedCount,
      duplicateCount: job.duplicateCount,
      industryAccepted: 0,
      industryReview: job.reviewRequiredCount,
      industryRejected: job.rejectedCount,
      withPhone: 0,
      withoutWebsite: 0,
      withoutEmail: 0,
      segmentBreakdown: [],
    },
  });

  return {
    jobId,
    status: CollectionJobStatus.COMPLETED,
    currentQuery: job.currentQuery,
    processedQueries: job.processedQueries,
    totalQueries: job.totalQueries,
    remainingQueries: 0,
    rawResultCount: job.rawResultCount,
    candidatesCreated: job.acceptedCount,
    stepCandidatesCreated: 0,
    acceptedCount: job.acceptedCount,
    reviewRequiredCount: job.reviewRequiredCount,
    rejectedCount: job.rejectedCount,
    duplicateCount: job.duplicateCount,
    apiCallCount: job.apiCallCount,
    lastMessage: finalMessage,
    done: true,
  };
}

export async function pauseCollectionJob(jobId: string) {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new Error("수집 작업을 찾을 수 없습니다.");
  if (
    job.status !== CollectionJobStatus.RUNNING &&
    job.status !== CollectionJobStatus.QUEUED
  ) {
    return { ok: false, status: job.status, message: "일시정지할 수 없는 상태입니다." };
  }
  await updateJobProgress(jobId, {
    status: CollectionJobStatus.PAUSED,
    lastMessage: "일시정지되었습니다. 계속 실행을 누르면 이어서 검색합니다.",
  });
  return { ok: true, status: CollectionJobStatus.PAUSED, message: "일시정지됨" };
}
