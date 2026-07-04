import { enrichSearchPlanWithKakaoQueries } from "@/lib/collection/kakao-search-queries";
import { resolveSearchProviderName } from "@/lib/collection/providers";
import {
  buildExpansionSearchPlan,
  CollectionJobType,
} from "@/lib/constants/collection";
import { CollectionJobStatus, SuggestionStatus } from "@/lib/constants/status";
import { assertCollectionLimits } from "@/lib/collection/limits";
import { collectionAudit } from "@/lib/collection/logger";
import { runCollectionJob } from "@/lib/collection/collection-service";
import { parseJsonArray } from "@/lib/utils/json";
import { getExpansionSuggestionById } from "@/lib/db/expansion-suggestions";
import { prisma } from "@/lib/prisma";

type ApproveExpansionInput = {
  suggestionId: string;
  keywords?: string[];
  regions?: string[];
  targetCount?: number;
  provider?: string;
};

const MAX_EXPANSION_TARGET_COUNT = 20;

export async function approveExpansionSuggestion(input: ApproveExpansionInput) {
  const suggestion = await getExpansionSuggestionById(input.suggestionId);
  if (!suggestion) {
    throw new Error("제안을 찾을 수 없습니다.");
  }

  if (suggestion.status !== SuggestionStatus.PENDING) {
    throw new Error("검토 대기(PENDING) 상태의 제안만 승인할 수 있습니다.");
  }

  const activeJob = await prisma.targetCollectionJob.findFirst({
    where: {
      suggestionId: suggestion.id,
      status: { in: [CollectionJobStatus.QUEUED, CollectionJobStatus.RUNNING] },
    },
  });

  if (activeJob) {
    throw new Error("이미 실행 중이거나 대기 중인 EXPANSION 작업이 있습니다.");
  }

  const limits = await assertCollectionLimits(suggestion.projectId);

  const keywords = input.keywords ?? parseJsonArray(suggestion.proposedKeywords);
  const regions =
    input.regions ??
    parseJsonArray(suggestion.proposedRegions) ??
    ["경기도 양주시", "경기도 포천시", "경기도 김포시", "인천광역시"];

  if (keywords.length === 0) {
    throw new Error("검색 키워드가 필요합니다.");
  }

  const requestedCount = Math.min(
    input.targetCount ?? suggestion.proposedTargetCount ?? 20,
    MAX_EXPANSION_TARGET_COUNT,
    limits.remainingDaily,
  );

  if (requestedCount <= 0) {
    throw new Error(
      "일일 신규 등록 한도에 도달해 추가수집을 실행할 수 없습니다.",
    );
  }

  const searchPlanBase = buildExpansionSearchPlan({
    projectId: suggestion.projectId,
    segmentName: suggestion.segmentName,
    keywords,
    regions,
    targetCount: requestedCount,
  });
  const providerName = resolveSearchProviderName(input.provider);
  const searchPlan =
    providerName === "kakao" || providerName === "composite"
      ? enrichSearchPlanWithKakaoQueries(searchPlanBase, providerName)
      : { ...searchPlanBase, provider: providerName };

  const job = await prisma.$transaction(async (tx) => {
    await tx.targetExpansionSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: SuggestionStatus.APPROVED,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        proposedKeywords: keywords,
        proposedRegions: regions,
        proposedTargetCount: requestedCount,
      },
    });

    return tx.targetCollectionJob.create({
      data: {
        projectId: suggestion.projectId,
        suggestionId: suggestion.id,
        jobType: CollectionJobType.EXPANSION,
        status: CollectionJobStatus.QUEUED,
        searchPlan,
        requestedCount: requestedCount,
      },
    });
  });

  collectionAudit(job.id, "EXPANSION_COLLECTION_REQUESTED", {
    suggestionId: suggestion.id,
    segmentName: suggestion.segmentName,
    requestedCount,
    provider: providerName,
  });

  const project = await prisma.project.findUnique({
    where: { id: suggestion.projectId },
  });

  const result = await runCollectionJob(job.id, {
    projectLocation: project?.location,
    askingPrice: project?.askingPrice,
    providerOverride: providerName,
  });

  if (result.status === CollectionJobStatus.COMPLETED) {
    await prisma.targetExpansionSuggestion.update({
      where: { id: suggestion.id },
      data: { status: SuggestionStatus.COMPLETED },
    });
  }

  return {
    suggestionId: suggestion.id,
    jobId: job.id,
    result,
  };
}

export async function rejectExpansionSuggestion(id: string, reason?: string) {
  const suggestion = await getExpansionSuggestionById(id);
  if (!suggestion) {
    throw new Error("제안을 찾을 수 없습니다.");
  }

  if (suggestion.status !== SuggestionStatus.PENDING) {
    throw new Error("검토 대기(PENDING) 상태의 제안만 거절할 수 있습니다.");
  }

  return prisma.targetExpansionSuggestion.update({
    where: { id },
    data: {
      status: SuggestionStatus.REJECTED,
      rejectedReason: reason ?? "관리자 거절",
      reviewedAt: new Date(),
    },
  });
}

export async function runApprovedCollectionJob(jobId: string) {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
    include: { suggestion: true, project: true },
  });

  if (!job) {
    throw new Error("수집 작업을 찾을 수 없습니다.");
  }

  if (job.status !== CollectionJobStatus.QUEUED) {
    throw new Error("대기 중인 작업만 실행할 수 있습니다.");
  }

  if (
    job.suggestionId &&
    job.suggestion?.status !== SuggestionStatus.APPROVED
  ) {
    throw new Error("승인된 제안에 연결된 작업만 실행할 수 있습니다.");
  }

  const result = await runCollectionJob(jobId, {
    projectLocation: job.project.location,
    askingPrice: job.project.askingPrice,
  });

  if (
    job.suggestionId &&
    result.status === CollectionJobStatus.COMPLETED
  ) {
    await prisma.targetExpansionSuggestion.update({
      where: { id: job.suggestionId },
      data: { status: SuggestionStatus.COMPLETED },
    });
  }

  return result;
}
