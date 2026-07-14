/**
 * TargetCollectionJob 진행상태 서버 헬퍼
 *
 * 장기적으로는 큐/백그라운드 워커가 필요하지만,
 * 이번 단계에서는 DB progress 필드로 준실시간 표시를 우선한다.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { CollectionJobStatus } from "@/lib/constants/status";
import {
  CollectionProgressStep,
  calcProcessProgressPercent,
  calcSearchProgressPercent,
  formatElapsed,
  stalledProgressWarning,
} from "@/lib/collection/progress-shared";

export {
  CollectionProgressStep,
  calcProcessProgressPercent,
  calcSearchProgressPercent,
  formatElapsed,
  stalledProgressWarning,
};

export type JobProgressUpdate = {
  status?: string;
  progressPercent?: number;
  currentStep?: string | null;
  currentQuery?: string | null;
  processedQueries?: number;
  totalQueries?: number;
  apiCallCount?: number;
  rawResultCount?: number;
  reviewRequiredCount?: number;
  collectedCount?: number;
  acceptedCount?: number;
  duplicateCount?: number;
  rejectedCount?: number;
  lastMessage?: string | null;
  errorMessage?: string | null;
  startedAt?: Date;
  completedAt?: Date;
  jobStats?: unknown;
};

/**
 * 진행상태 DB 업데이트 (검색어/주요 단계 단위로만 호출)
 * 비밀키·원본 API 응답은 저장하지 않는다.
 */
export async function updateJobProgress(
  jobId: string,
  patch: JobProgressUpdate,
): Promise<void> {
  const data: Record<string, unknown> = {
    lastProgressAt: new Date(),
  };

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.progressPercent !== undefined) {
    data.progressPercent = Math.min(100, Math.max(0, patch.progressPercent));
  }
  if (patch.currentStep !== undefined) data.currentStep = patch.currentStep;
  if (patch.currentQuery !== undefined) data.currentQuery = patch.currentQuery;
  if (patch.processedQueries !== undefined) {
    data.processedQueries = patch.processedQueries;
  }
  if (patch.totalQueries !== undefined) data.totalQueries = patch.totalQueries;
  if (patch.apiCallCount !== undefined) data.apiCallCount = patch.apiCallCount;
  if (patch.rawResultCount !== undefined) {
    data.rawResultCount = patch.rawResultCount;
  }
  if (patch.reviewRequiredCount !== undefined) {
    data.reviewRequiredCount = patch.reviewRequiredCount;
  }
  if (patch.collectedCount !== undefined) {
    data.collectedCount = patch.collectedCount;
  }
  if (patch.acceptedCount !== undefined) data.acceptedCount = patch.acceptedCount;
  if (patch.duplicateCount !== undefined) {
    data.duplicateCount = patch.duplicateCount;
  }
  if (patch.rejectedCount !== undefined) data.rejectedCount = patch.rejectedCount;
  if (patch.lastMessage !== undefined) data.lastMessage = patch.lastMessage;
  if (patch.errorMessage !== undefined) data.errorMessage = patch.errorMessage;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt;
  if (patch.completedAt !== undefined) data.completedAt = patch.completedAt;
  if (patch.jobStats !== undefined) data.jobStats = patch.jobStats;

  await prisma.targetCollectionJob.update({
    where: { id: jobId },
    data,
  });
}

export async function isJobCancelRequested(jobId: string): Promise<boolean> {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  if (!job) return true;
  return (
    job.status === CollectionJobStatus.CANCELLED ||
    job.status === CollectionJobStatus.CANCEL_REQUESTED
  );
}
