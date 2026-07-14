import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import {
  buildInitialSearchPlan,
  CollectionJobType,
} from "@/lib/constants/collection";
import { enrichSearchPlanWithKakaoQueries } from "@/lib/collection/kakao-search-queries";
import { processCollectionCandidate } from "@/lib/collection/candidate-pipeline";
import { writeActivityLog } from "@/lib/audit/activity-log-service";
import {
  assertCollectionLimits,
  countTodayNewCollectedCompanies,
  getActiveInitialJob,
  getCompletedInitialJob,
} from "@/lib/collection/limits";
import { collectionAudit, collectionError, collectionLog } from "@/lib/collection/logger";
import { ApiError } from "@/lib/api/errors";
import {
  assertKakaoProviderReady,
  getTargetSearchProvider,
  resolveSearchProviderName,
} from "@/lib/collection/providers";
import { hasBlockingKakaoPermissionError } from "@/lib/db/search-provider-status";
import { CompositeSearchProvider } from "@/lib/collection/providers/composite-search-provider";
import { KakaoLocalSearchProvider } from "@/lib/collection/providers/kakao-local-search-provider";
import {
  calcProcessProgressPercent,
  CollectionProgressStep,
  isJobCancelRequested,
  updateJobProgress,
} from "@/lib/collection/progress";
import type {
  CollectionAuditEvent,
  CollectionJobResult,
  CollectionJobStats,
  SearchPlan,
  SearchProviderName,
} from "@/lib/collection/types";
import { applyTargetFit } from "@/lib/scoring/calculate-target-fit";
import { prisma } from "@/lib/prisma";
import {
  recordProviderError,
  recordProviderSuccess,
} from "@/lib/db/search-provider-status";
import { CollectionJobStatus, ReviewStatus } from "@/lib/constants/status";

type RunInitialCollectionOptions = {
  projectId: string;
  force?: boolean;
  confirmed?: boolean;
  requestedCount?: number;
  provider?: string;
  dryRun?: boolean;
  importMode?: "review" | "fast";
  /** true면 job만 생성하고 실행은 호출측에서 비동기로 수행 */
  deferRun?: boolean;
};

const BATCH_SIZE = 5;

/**
 * 초기 수집 작업 생성. deferRun=true면 QUEUED 상태로 jobId만 반환.
 * Vercel timeout을 줄이려면 create → after(run) 패턴을 권장한다.
 */
export async function createInitialCollectionJob({
  projectId,
  force = false,
  confirmed = false,
  requestedCount = 30,
  provider: providerOverride,
  dryRun = false,
  importMode,
}: Omit<RunInitialCollectionOptions, "deferRun">): Promise<{
  jobId: string;
  projectLocation: string | null;
  askingPrice: bigint | null;
  providerName: SearchProviderName;
  dryRun: boolean;
  requestedCount: number;
}> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error("프로젝트를 찾을 수 없습니다.");
  }

  const activeJob = await getActiveInitialJob(projectId);
  if (activeJob) {
    throw new Error("이미 실행 중인 초기 수집 작업이 있습니다. 완료 후 다시 시도하세요.");
  }

  const completedJob = await getCompletedInitialJob(projectId);
  if (completedJob && !force && !confirmed) {
    throw new Error(
      "이미 완료된 초기 수집이 있습니다. 재실행하려면 확인(confirmed=true) 후 요청하세요.",
    );
  }

  let limits: {
    todayCount: number;
    pendingReview: number;
    remainingDaily: number;
  } = {
    todayCount: 0,
    pendingReview: 0,
    remainingDaily: COLLECTION_LIMITS.maxNewCompaniesPerDay,
  };
  if (!dryRun) {
    limits = await assertCollectionLimits(projectId);
  }
  const boundedRequest = Math.min(
    requestedCount,
    COLLECTION_LIMITS.maxInitialCandidates,
    dryRun ? requestedCount : limits.remainingDaily,
  );

  if (boundedRequest <= 0 && !dryRun) {
    throw new Error("일일 신규 등록 한도에 도달해 수집을 시작할 수 없습니다.");
  }

  const providerName = resolveSearchProviderName(providerOverride);
  // Kakao/composite는 키 없으면 job을 만들지 않는다 (조용한 demo fallback 금지)
  assertKakaoProviderReady(providerName);
  if (
    (providerName === "kakao" || providerName === "composite") &&
    (await hasBlockingKakaoPermissionError())
  ) {
    throw new ApiError(
      "Kakao 연결 테스트가 실패한 상태입니다. Settings에서 Kakao 연결 테스트를 먼저 통과시킨 후 수집을 실행하세요.",
      403,
      "KAKAO_PERMISSION_BLOCKED",
    );
  }

  let searchPlan: SearchPlan = buildInitialSearchPlan(projectId, boundedRequest);
  if (providerName === "kakao" || providerName === "composite") {
    searchPlan = enrichSearchPlanWithKakaoQueries(searchPlan, providerName);
  } else {
    searchPlan = { ...searchPlan, provider: providerName };
  }
  searchPlan = {
    ...searchPlan,
    dryRun,
    importMode: importMode ?? (providerName === "demo" ? "fast" : "review"),
  };

  const totalQueries =
    searchPlan.queryCount ??
    searchPlan.generatedQueries?.length ??
    searchPlan.keywords.length;

  const job = await prisma.targetCollectionJob.create({
    data: {
      projectId,
      jobType: CollectionJobType.INITIAL,
      status: CollectionJobStatus.QUEUED,
      searchPlan,
      requestedCount: boundedRequest,
      progressPercent: 0,
      currentStep: CollectionProgressStep.PREPARING,
      totalQueries,
      lastMessage: "수집 작업이 대기열에 등록되었습니다.",
      lastProgressAt: new Date(),
    },
  });

  collectionAudit(job.id, "INITIAL_COLLECTION_REQUESTED", {
    provider: providerName,
    projectId,
    requestedCount: boundedRequest,
  });
  if (providerName !== "demo") {
    collectionAudit(job.id, "EXTERNAL_SEARCH_REQUESTED", {
      provider: providerName,
      queryCount: searchPlan.queryCount ?? 0,
    });
  }
  collectionLog(job.id, "작업 생성", {
    provider: providerName,
    projectId,
    limits,
    requestedCount: boundedRequest,
  });

  return {
    jobId: job.id,
    projectLocation: project.location,
    askingPrice: project.askingPrice,
    providerName,
    dryRun,
    requestedCount: boundedRequest,
  };
}

export async function runInitialCollection(
  options: RunInitialCollectionOptions,
): Promise<CollectionJobResult> {
  const created = await createInitialCollectionJob(options);
  if (options.deferRun) {
    return {
      jobId: created.jobId,
      status: CollectionJobStatus.QUEUED,
      requestedCount: created.requestedCount,
      collectedCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      gradeCounts: { A: 0, B: 0, C: 0, EXCLUDED: 0 },
      errorMessage: null,
      jobStats: null,
    };
  }
  return runCollectionJob(created.jobId, {
    projectLocation: created.projectLocation,
    askingPrice: created.askingPrice,
    providerOverride: created.providerName,
    dryRun: created.dryRun,
  });
}

type RunCollectionJobContext = {
  projectLocation?: string | null;
  askingPrice?: bigint | null;
  providerOverride?: SearchProviderName;
  dryRun?: boolean;
};

export async function runCollectionJob(
  jobId: string,
  context: RunCollectionJobContext = {},
): Promise<CollectionJobResult> {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error("수집 작업을 찾을 수 없습니다.");
  }

  if (job.status === CollectionJobStatus.RUNNING) {
    throw new Error("이미 실행 중인 작업입니다.");
  }

  if (
    job.status === CollectionJobStatus.COMPLETED ||
    job.status === CollectionJobStatus.DRY_RUN ||
    job.status === CollectionJobStatus.CANCELLED
  ) {
    throw new Error("이미 종료된 작업입니다.");
  }

  const projectId = job.projectId;
  let searchPlan = job.searchPlan as SearchPlan;
  searchPlan = { ...searchPlan, jobId: job.id };

  const providerName = resolveSearchProviderName(
    context.providerOverride ?? searchPlan.provider,
  );
  const provider = getTargetSearchProvider(providerName, job.id);
  const auditPrefix =
    job.jobType === CollectionJobType.EXPANSION ? "EXPANSION" : "INITIAL";
  const createdEvent: CollectionAuditEvent =
    auditPrefix === "EXPANSION" ? "EXPANSION_COMPANY_CREATED" : "COMPANY_CREATED";
  const duplicateEvent: CollectionAuditEvent =
    auditPrefix === "EXPANSION"
      ? "EXPANSION_DUPLICATE_FOUND"
      : "COMPANY_DUPLICATE_FOUND";
  const startedEvent: CollectionAuditEvent = `${auditPrefix}_COLLECTION_STARTED`;
  const completedEvent: CollectionAuditEvent = `${auditPrefix}_COLLECTION_COMPLETED`;
  const failedEvent: CollectionAuditEvent = `${auditPrefix}_COLLECTION_FAILED`;
  const isExternal = providerName !== "demo";
  const dryRun = context.dryRun ?? searchPlan.dryRun ?? false;
  const importMode = searchPlan.importMode ?? (providerName === "demo" ? "fast" : "review");

  let collectedCount = job.collectedCount;
  let acceptedCount = job.acceptedCount;
  let duplicateCount = job.duplicateCount;
  let rejectedCount = job.rejectedCount;
  let reviewRequiredCount = job.reviewRequiredCount ?? 0;
  const gradeCounts = { A: 0, B: 0, C: 0, EXCLUDED: 0 };
  let withPhone = 0;
  let withoutWebsite = 0;
  let withoutEmail = 0;

  try {
    await updateJobProgress(job.id, {
      status: CollectionJobStatus.RUNNING,
      currentStep: CollectionProgressStep.BUILDING_PLAN,
      progressPercent: 5,
      startedAt: job.startedAt ?? new Date(),
      lastMessage: "검색 계획을 준비합니다.",
    });

    // Persist jobId onto searchPlan for provider progress hooks
    await prisma.targetCollectionJob.update({
      where: { id: job.id },
      data: { searchPlan },
    });

    collectionAudit(job.id, startedEvent, { jobType: job.jobType, provider: providerName });
    if (isExternal) {
      collectionAudit(job.id, "EXTERNAL_SEARCH_STARTED", { provider: providerName });
    }
    collectionLog(job.id, "수집 시작", { jobType: job.jobType, provider: providerName });

    if (await isJobCancelRequested(job.id)) {
      return finalizeCancelled(job.id, {
        collectedCount,
        acceptedCount,
        duplicateCount,
        rejectedCount,
        gradeCounts,
      });
    }

    const candidates = await provider.searchCompanies(searchPlan);

    if (await isJobCancelRequested(job.id)) {
      return finalizeCancelled(job.id, {
        collectedCount,
        acceptedCount,
        duplicateCount,
        rejectedCount,
        gradeCounts,
      });
    }

    collectionLog(job.id, "Provider 후보 반환", { count: candidates.length });

    const kakaoContext =
      provider instanceof KakaoLocalSearchProvider
        ? provider.getContext()
        : provider instanceof CompositeSearchProvider
          ? provider.getKakaoContext()
          : null;

    if (kakaoContext?.cancelled) {
      return finalizeCancelled(job.id, {
        collectedCount,
        acceptedCount,
        duplicateCount,
        rejectedCount,
        gradeCounts,
      });
    }

    if (candidates.length === 0) {
      const raw = kakaoContext?.rawResultCount ?? 0;
      const industryRejected = kakaoContext?.industryRejected ?? 0;
      const emptyMessage =
        raw === 0
          ? "검색은 완료되었지만 Kakao에서 해당 조건의 업체를 찾지 못했습니다."
          : industryRejected > 0
            ? "검색 결과는 있었지만 업종 적합성 검증에서 모두 제외되었습니다."
            : "업체 후보가 생성되지 않았습니다. 검색계획을 확인하세요.";

      const emptyStatus = dryRun
        ? CollectionJobStatus.DRY_RUN
        : CollectionJobStatus.COMPLETED;

      const emptyStats = buildJobStats({
        provider: providerName,
        searchPlan,
        kakaoContext,
        collectedCount: 0,
        acceptedCount: 0,
        duplicateCount: 0,
        rejectedCount: industryRejected,
        withPhone: 0,
        withoutWebsite: 0,
        withoutEmail: 0,
      });

      await updateJobProgress(job.id, {
        status: emptyStatus,
        currentStep: CollectionProgressStep.COMPLETED,
        progressPercent: 100,
        collectedCount: 0,
        acceptedCount: 0,
        duplicateCount: 0,
        rejectedCount: industryRejected,
        reviewRequiredCount: kakaoContext?.industryReview ?? 0,
        apiCallCount: kakaoContext?.apiCallCount,
        rawResultCount: raw,
        completedAt: new Date(),
        lastMessage: emptyMessage,
        jobStats: emptyStats,
      });

      if (isExternal) {
        collectionAudit(job.id, "EXTERNAL_SEARCH_COMPLETED", {
          provider: providerName,
          acceptedCount: 0,
          duplicateCount: 0,
          rejectedCount: industryRejected,
          dryRun,
          noResults: true,
        });
      }

      const updatedEmpty = await prisma.targetCollectionJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      return mapJobResult(updatedEmpty, gradeCounts, emptyStats);
    }

    if (kakaoContext) {
      rejectedCount += kakaoContext.industryRejected;
      reviewRequiredCount = kakaoContext.industryReview;
    }

    await updateJobProgress(job.id, {
      currentStep: CollectionProgressStep.NORMALIZING,
      progressPercent: 60,
      collectedCount: candidates.length,
      rejectedCount,
      reviewRequiredCount,
      apiCallCount: kakaoContext?.apiCallCount,
      rawResultCount: kakaoContext?.rawResultCount,
      lastMessage: `후보 ${candidates.length}건 정규화·검증을 시작합니다.`,
    });

    const segmentCounts = new Map<string, number>();
    const processLimit = job.requestedCount || searchPlan.maxTotal;
    let processed = 0;

    for (let index = 0; index < candidates.length; index += 1) {
      if (await isJobCancelRequested(job.id)) {
        return finalizeCancelled(job.id, {
          collectedCount,
          acceptedCount,
          duplicateCount,
          rejectedCount,
          gradeCounts,
        });
      }

      if (acceptedCount >= processLimit) {
        collectionLog(job.id, "요청 처리 한도 도달", { acceptedCount, processLimit });
        break;
      }

      const pendingReview = dryRun
        ? 0
        : await prisma.projectCompany.count({
            where: { projectId, reviewStatus: ReviewStatus.PENDING },
          });
      if (!dryRun && pendingReview >= COLLECTION_LIMITS.maxPendingReview) {
        collectionLog(job.id, "검토 대기 한도 도달", { pendingReview });
        break;
      }

      const todayNewCount = dryRun ? 0 : await countTodayNewCollectedCompanies();
      if (!dryRun && todayNewCount >= COLLECTION_LIMITS.maxNewCompaniesPerDay) {
        collectionLog(job.id, "일일 신규 한도 도달", { todayNewCount });
        break;
      }

      const rawCandidate = candidates[index]!;
      collectedCount += 1;
      processed += 1;

      if (index === 0 || index % 10 === 0) {
        await updateJobProgress(job.id, {
          currentStep: CollectionProgressStep.VALIDATING,
          progressPercent: 60 + Math.min(20, Math.round((processed / candidates.length) * 20)),
          lastMessage: `검증 중: ${rawCandidate.companyName}`,
        });
      }

      let candidate = provider.normalizeCompany(rawCandidate);
      candidate = applyTargetFit(candidate, {
        projectLocation: context.projectLocation,
        askingPrice: context.askingPrice,
      });

      const validation = provider.validateCandidate(candidate);
      if (!validation.valid) {
        rejectedCount += 1;
        collectionAudit(job.id, "COMPANY_REJECTED", {
          name: candidate.companyName,
          reason: validation.reason,
        });
        continue;
      }

      if (candidate.targetGrade === "EXCLUDED") {
        rejectedCount += 1;
        gradeCounts.EXCLUDED += 1;
        collectionAudit(job.id, "COMPANY_REJECTED", {
          name: candidate.companyName,
          reason: "적합도 39점 이하",
          fitScore: candidate.fitScore,
        });
        continue;
      }

      const segmentKey = candidate.detailedIndustry ?? "unknown";
      const segmentCount = segmentCounts.get(segmentKey) ?? 0;
      if (segmentCount >= searchPlan.maxPerSegment) {
        rejectedCount += 1;
        collectionAudit(job.id, "COMPANY_REJECTED", {
          name: candidate.companyName,
          reason: "업종별 한도 초과",
        });
        continue;
      }

      if (index === 0 || acceptedCount % BATCH_SIZE === 0) {
        await updateJobProgress(job.id, {
          currentStep:
            importMode === "review"
              ? CollectionProgressStep.SAVING_CANDIDATES
              : CollectionProgressStep.SAVING_COMPANIES,
          progressPercent: calcProcessProgressPercent(acceptedCount, processLimit),
          collectedCount,
          acceptedCount,
          duplicateCount,
          rejectedCount,
          reviewRequiredCount,
        });
      }

      const processResult = await processCollectionCandidate({
        candidate,
        projectId,
        jobId: job.id,
        isExternal,
        dryRun,
        importMode,
      });

      if (processResult.action === "rejected") {
        rejectedCount += 1;
        continue;
      }

      if (processResult.action === "duplicate") {
        duplicateCount += 1;
        collectionAudit(job.id, isExternal ? "EXTERNAL_COMPANY_DUPLICATE" : duplicateEvent, {
          name: candidate.companyName,
        });
        continue;
      }

      if (processResult.action === "queued") {
        acceptedCount += 1;
        reviewRequiredCount += 1;
        segmentCounts.set(segmentKey, segmentCount + 1);
        if (candidate.mainPhone) withPhone += 1;
        if (!candidate.website) withoutWebsite += 1;
        if (!candidate.generalEmail) withoutEmail += 1;
        continue;
      }

      acceptedCount += 1;
      segmentCounts.set(segmentKey, segmentCount + 1);
      trackGrade(gradeCounts, candidate.targetGrade);

      if (candidate.mainPhone) withPhone += 1;
      if (!candidate.website) withoutWebsite += 1;
      if (!candidate.generalEmail) withoutEmail += 1;

      collectionAudit(job.id, isExternal ? "EXTERNAL_COMPANY_CREATED" : createdEvent, {
        companyId: processResult.companyId,
        name: candidate.companyName,
        grade: candidate.targetGrade,
        fitScore: candidate.fitScore,
      });

      if (acceptedCount % BATCH_SIZE === 0) {
        await updateJobProgress(job.id, {
          currentStep: CollectionProgressStep.SAVING_COMPANIES,
          progressPercent: calcProcessProgressPercent(acceptedCount, processLimit),
          collectedCount,
          acceptedCount,
          duplicateCount,
          rejectedCount,
          reviewRequiredCount,
          lastMessage: `신규 ${acceptedCount}건 등록됨`,
        });
      }
    }

    await updateJobProgress(job.id, {
      currentStep: CollectionProgressStep.AGGREGATING,
      progressPercent: 95,
      collectedCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      reviewRequiredCount,
      lastMessage: "작업 결과를 집계합니다.",
    });

    const jobStats = buildJobStats({
      provider: providerName,
      searchPlan,
      kakaoContext,
      collectedCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      withPhone,
      withoutWebsite,
      withoutEmail,
    });

    const finalStatus = dryRun
      ? CollectionJobStatus.DRY_RUN
      : CollectionJobStatus.COMPLETED;

    const completionMessage = dryRun
      ? acceptedCount > 0
        ? `미리보기 완료: 후보 ${acceptedCount}건`
        : "미리보기 모드로 검색 후보만 생성되었습니다. 후보 목록에서 선택 등록하세요."
      : acceptedCount > 0
        ? `수집 완료: 신규 ${acceptedCount}곳 등록`
        : duplicateCount > 0 && rejectedCount === 0
          ? "신규 업체는 없고 기존 등록 업체와 중복되었습니다."
          : (kakaoContext?.rawResultCount ?? 0) > 0 && rejectedCount > 0
            ? "검색 결과는 있었지만 업종 적합성 검증에서 모두 제외되었습니다."
            : (kakaoContext?.rawResultCount ?? 0) === 0
              ? "검색은 완료되었지만 Kakao에서 해당 조건의 업체를 찾지 못했습니다."
              : "수집 작업이 완료되었습니다.";

    await updateJobProgress(job.id, {
      status: finalStatus,
      currentStep: CollectionProgressStep.COMPLETED,
      progressPercent: 100,
      collectedCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      reviewRequiredCount,
      apiCallCount: kakaoContext?.apiCallCount,
      rawResultCount: kakaoContext?.rawResultCount,
      completedAt: new Date(),
      lastMessage: completionMessage,
      jobStats,
    });

    const updatedJob = await prisma.targetCollectionJob.findUniqueOrThrow({
      where: { id: job.id },
    });

    collectionAudit(job.id, completedEvent, {
      collectedCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      gradeCounts,
    });
    if (isExternal) {
      collectionAudit(job.id, "EXTERNAL_SEARCH_COMPLETED", {
        provider: providerName,
        acceptedCount,
        duplicateCount,
        rejectedCount,
        dryRun,
      });
      await writeActivityLog({
        eventType: "EXTERNAL_SEARCH_COMPLETED",
        summary: dryRun
          ? `외부 검색 미리보기 완료 (${acceptedCount}건 후보)`
          : `외부 검색 완료 (신규 ${acceptedCount}건)`,
        projectId,
        collectionJobId: job.id,
        metadata: { provider: providerName, dryRun, acceptedCount, duplicateCount },
      });
      if (!dryRun) {
        await recordProviderSuccess(providerName);
      }
    }

    return mapJobResult(updatedJob, gradeCounts, jobStats);
  } catch (error) {
    collectionError(job.id, "수집 실패", error);
    collectionAudit(job.id, failedEvent, {
      collectedCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      message: error instanceof Error ? error.message : "unknown",
    });
    if (isExternal) {
      collectionAudit(job.id, "EXTERNAL_SEARCH_FAILED", {
        provider: providerName,
        message: error instanceof Error ? error.message : "unknown",
      });
      await recordProviderError(
        providerName,
        error instanceof Error ? error.message : "unknown",
      );
    }

    const safeMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    await updateJobProgress(job.id, {
      status: CollectionJobStatus.FAILED,
      currentStep: CollectionProgressStep.FAILED,
      collectedCount,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      reviewRequiredCount,
      errorMessage: safeMessage,
      completedAt: new Date(),
      lastMessage: "수집 작업이 실패했습니다.",
    });

    const updatedJob = await prisma.targetCollectionJob.findUniqueOrThrow({
      where: { id: job.id },
    });

    return mapJobResult(updatedJob, gradeCounts);
  }
}

export async function requestCancelCollectionJob(jobId: string): Promise<{
  ok: boolean;
  status: string;
  message: string;
}> {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) {
    throw new Error("수집 작업을 찾을 수 없습니다.");
  }
  if (job.status !== CollectionJobStatus.RUNNING && job.status !== CollectionJobStatus.QUEUED) {
    return {
      ok: false,
      status: job.status,
      message: "실행 중인 작업만 취소할 수 있습니다.",
    };
  }

  await updateJobProgress(jobId, {
    status: CollectionJobStatus.CANCEL_REQUESTED,
    lastMessage: "취소 요청이 접수되었습니다. 현재 검색어 처리 후 중단합니다.",
  });

  return {
    ok: true,
    status: CollectionJobStatus.CANCEL_REQUESTED,
    message: "취소 요청이 접수되었습니다.",
  };
}

async function finalizeCancelled(
  jobId: string,
  counts: {
    collectedCount: number;
    acceptedCount: number;
    duplicateCount: number;
    rejectedCount: number;
    gradeCounts: { A: number; B: number; C: number; EXCLUDED: number };
  },
): Promise<CollectionJobResult> {
  await updateJobProgress(jobId, {
    status: CollectionJobStatus.CANCELLED,
    currentStep: CollectionProgressStep.CANCELLED,
    collectedCount: counts.collectedCount,
    acceptedCount: counts.acceptedCount,
    duplicateCount: counts.duplicateCount,
    rejectedCount: counts.rejectedCount,
    completedAt: new Date(),
    lastMessage: "수집 작업이 취소되었습니다. 이미 저장된 데이터는 유지됩니다.",
  });
  const updatedJob = await prisma.targetCollectionJob.findUniqueOrThrow({
    where: { id: jobId },
  });
  return mapJobResult(updatedJob, counts.gradeCounts);
}

function buildJobStats(params: {
  provider: string;
  searchPlan: SearchPlan;
  kakaoContext: ReturnType<KakaoLocalSearchProvider["getContext"]> | null;
  collectedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  withPhone: number;
  withoutWebsite: number;
  withoutEmail: number;
}): CollectionJobStats {
  return {
    provider: params.provider,
    queryCount: params.searchPlan.queryCount ?? params.searchPlan.keywords.length,
    apiCallCount: params.kakaoContext?.apiCallCount ?? 0,
    rawResultCount: params.kakaoContext?.rawResultCount ?? params.collectedCount,
    industryAccepted: params.kakaoContext?.industryAccepted ?? 0,
    industryReview: params.kakaoContext?.industryReview ?? 0,
    industryRejected: params.kakaoContext?.industryRejected ?? 0,
    duplicateCount: params.duplicateCount,
    acceptedCount: params.acceptedCount,
    rejectedCount: params.rejectedCount,
    withPhone: params.withPhone,
    withoutWebsite: params.withoutWebsite,
    withoutEmail: params.withoutEmail,
    segmentBreakdown: [],
  };
}

function trackGrade(
  gradeCounts: { A: number; B: number; C: number; EXCLUDED: number },
  grade?: string,
) {
  if (grade === "A") gradeCounts.A += 1;
  else if (grade === "B") gradeCounts.B += 1;
  else if (grade === "C") gradeCounts.C += 1;
  else if (grade === "EXCLUDED") gradeCounts.EXCLUDED += 1;
}

function mapJobResult(
  job: {
    id: string;
    status: string;
    requestedCount: number;
    collectedCount: number;
    acceptedCount: number;
    duplicateCount: number;
    rejectedCount: number;
    errorMessage: string | null;
    jobStats?: unknown;
  },
  gradeCounts: { A: number; B: number; C: number; EXCLUDED: number },
  jobStats?: CollectionJobStats | null,
): CollectionJobResult {
  return {
    jobId: job.id,
    status: job.status,
    requestedCount: job.requestedCount,
    collectedCount: job.collectedCount,
    acceptedCount: job.acceptedCount,
    duplicateCount: job.duplicateCount,
    rejectedCount: job.rejectedCount,
    gradeCounts,
    errorMessage: job.errorMessage,
    jobStats: jobStats ?? (job.jobStats as CollectionJobStats | null) ?? null,
  };
}
