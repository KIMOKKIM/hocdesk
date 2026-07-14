import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { CollectionJobStatus } from "@/lib/constants/status";
import { jobIdFromDiscoveredReason } from "@/lib/collection/duplicate-check";
import { isDatabaseSetupError } from "@/lib/db/errors";

const JOB_BASE_SELECT = {
  id: true,
  jobType: true,
  status: true,
  searchPlan: true,
  requestedCount: true,
  collectedCount: true,
  acceptedCount: true,
  duplicateCount: true,
  rejectedCount: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
} as const;

const JOB_PROGRESS_SELECT = {
  ...JOB_BASE_SELECT,
  progressPercent: true,
  currentStep: true,
  currentQuery: true,
  processedQueries: true,
  totalQueries: true,
  apiCallCount: true,
  rawResultCount: true,
  reviewRequiredCount: true,
  lastProgressAt: true,
  lastMessage: true,
} as const;

type JobRow = {
  id: string;
  jobType: string;
  status: string;
  searchPlan: unknown;
  requestedCount: number;
  collectedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  progressPercent?: number | null;
  currentStep?: string | null;
  currentQuery?: string | null;
  processedQueries?: number | null;
  totalQueries?: number | null;
  apiCallCount?: number | null;
  rawResultCount?: number | null;
  reviewRequiredCount?: number | null;
  lastProgressAt?: Date | null;
  lastMessage?: string | null;
};

function mapJobSummary(job: JobRow) {
  const plan = job.searchPlan as {
    provider?: string;
    requestedSegments?: string[];
  };
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    statusLabel: collectionStatusLabel(job.status),
    provider: plan.provider ?? "kakao",
    requestedSegments: plan.requestedSegments ?? [],
    requestedCount: job.requestedCount,
    collectedCount: job.collectedCount,
    acceptedCount: job.acceptedCount,
    duplicateCount: job.duplicateCount,
    rejectedCount: job.rejectedCount,
    progressPercent: job.progressPercent ?? null,
    currentStep: job.currentStep ?? null,
    currentQuery: job.currentQuery ?? null,
    processedQueries: job.processedQueries ?? 0,
    totalQueries: job.totalQueries ?? 0,
    apiCallCount: job.apiCallCount ?? 0,
    rawResultCount: job.rawResultCount ?? 0,
    reviewRequiredCount: job.reviewRequiredCount ?? 0,
    lastProgressAt: job.lastProgressAt
      ? formatDateTime(job.lastProgressAt)
      : null,
    lastMessage: job.lastMessage ?? null,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt ? formatDateTime(job.startedAt) : null,
    completedAt: job.completedAt ? formatDateTime(job.completedAt) : null,
    createdAt: formatDateTime(job.createdAt),
  };
}

export async function getCollectionJobsByProject(projectId: string) {
  try {
    const jobs = await prisma.targetCollectionJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: JOB_PROGRESS_SELECT,
    });
    return jobs.map((job) => mapJobSummary(job));
  } catch (error) {
    if (!isDatabaseSetupError(error)) throw error;
    // progress 컬럼 미준비 시 기본 필드만 조회
    const jobs = await prisma.targetCollectionJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: JOB_BASE_SELECT,
    });
    return jobs.map((job) => mapJobSummary(job));
  }
}

export async function getCollectionJobDetail(jobId: string) {
  type JobWithProject = {
    id: string;
    projectId: string;
    jobType: string;
    status: string;
    searchPlan: unknown;
    jobStats: unknown;
    requestedCount: number;
    collectedCount: number;
    acceptedCount: number;
    duplicateCount: number;
    rejectedCount: number;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    progressPercent?: number | null;
    currentStep?: string | null;
    currentQuery?: string | null;
    processedQueries?: number | null;
    totalQueries?: number | null;
    apiCallCount?: number | null;
    rawResultCount?: number | null;
    reviewRequiredCount?: number | null;
    lastProgressAt?: Date | null;
    lastMessage?: string | null;
    project: { id: string; name: string };
  };

  let job: JobWithProject | null = null;

  try {
    job = await prisma.targetCollectionJob.findUnique({
      where: { id: jobId },
      include: { project: { select: { id: true, name: true } } },
    });
  } catch (error) {
    if (!isDatabaseSetupError(error)) throw error;
    const base = await prisma.targetCollectionJob.findUnique({
      where: { id: jobId },
      select: {
        ...JOB_BASE_SELECT,
        projectId: true,
        jobStats: true,
        project: { select: { id: true, name: true } },
      },
    });
    if (!base) return null;
    job = {
      ...base,
      progressPercent: null,
      currentStep: null,
      currentQuery: null,
      processedQueries: 0,
      totalQueries: 0,
      apiCallCount: 0,
      rawResultCount: 0,
      reviewRequiredCount: 0,
      lastProgressAt: null,
      lastMessage: null,
    };
  }

  if (!job) return null;

  const sources = await prisma.companySource.findMany({
    where: {
      discoveredReason: { startsWith: `job:${jobId}|` },
    },
    include: {
      company: {
        select: {
          id: true,
          companyName: true,
          industryGroup: true,
          detailedIndustry: true,
          region: true,
          status: true,
        },
      },
    },
    orderBy: { collectedAt: "desc" },
  });

  const companyIds = sources.map((source) => source.company.id);
  const projectCompanies = companyIds.length
    ? await prisma.projectCompany.findMany({
        where: {
          projectId: job.projectId,
          companyId: { in: companyIds },
        },
        select: {
          id: true,
          companyId: true,
          targetGrade: true,
          fitScore: true,
          reviewStatus: true,
        },
      })
    : [];

  const pcByCompany = new Map(
    projectCompanies.map((item) => [item.companyId, item]),
  );

  const companies = sources.map((source) => {
    const pc = pcByCompany.get(source.company.id);
    return {
      projectCompanyId: pc?.id ?? null,
      companyId: source.company.id,
      companyName: source.company.companyName,
      industryGroup: source.company.industryGroup,
      detailedIndustry: source.company.detailedIndustry,
      region: source.company.region,
      status: source.company.status,
      targetGrade: pc?.targetGrade ?? null,
      fitScore: pc?.fitScore ?? null,
      reviewStatus: pc?.reviewStatus ?? null,
      sourceType: source.sourceType,
      searchKeyword: source.searchKeyword,
      discoveredReason: source.discoveredReason,
      collectedAt: formatDateTime(source.collectedAt),
    };
  });

  const gradeCounts = companies.reduce(
    (acc, company) => {
      if (company.targetGrade === "A") acc.A += 1;
      else if (company.targetGrade === "B") acc.B += 1;
      else if (company.targetGrade === "C") acc.C += 1;
      return acc;
    },
    { A: 0, B: 0, C: 0 },
  );

  return {
    id: job.id,
    projectId: job.projectId,
    projectName: job.project.name,
    jobType: job.jobType,
    status: job.status,
    statusLabel: collectionStatusLabel(job.status),
    provider:
      (job.searchPlan as { provider?: string } | null)?.provider ??
      (job.jobStats as { provider?: string } | null)?.provider ??
      "unknown",
    searchPlan: job.searchPlan,
    jobStats: job.jobStats,
    requestedCount: job.requestedCount,
    collectedCount: job.collectedCount,
    acceptedCount: job.acceptedCount,
    duplicateCount: job.duplicateCount,
    rejectedCount: job.rejectedCount,
    progressPercent: job.progressPercent ?? null,
    currentStep: job.currentStep ?? null,
    currentQuery: job.currentQuery ?? null,
    processedQueries: job.processedQueries ?? 0,
    totalQueries: job.totalQueries ?? 0,
    apiCallCount:
      job.apiCallCount ??
      (job.jobStats as { apiCallCount?: number } | null)?.apiCallCount ??
      0,
    rawResultCount:
      job.rawResultCount ??
      (job.jobStats as { rawResultCount?: number } | null)?.rawResultCount ??
      0,
    reviewRequiredCount: job.reviewRequiredCount ?? 0,
    lastProgressAt: job.lastProgressAt
      ? job.lastProgressAt.toISOString()
      : null,
    lastProgressAtLabel: job.lastProgressAt
      ? formatDateTime(job.lastProgressAt)
      : null,
    lastMessage: job.lastMessage ?? null,
    gradeCounts,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt ? formatDateTime(job.startedAt) : null,
    startedAtIso: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? formatDateTime(job.completedAt) : null,
    createdAt: formatDateTime(job.createdAt),
    companies,
  };
}

export async function getLatestInitialJob(projectId: string) {
  try {
    return await prisma.targetCollectionJob.findFirst({
      where: { projectId, jobType: "INITIAL" },
      orderBy: { createdAt: "desc" },
      select: JOB_PROGRESS_SELECT,
    });
  } catch (error) {
    if (!isDatabaseSetupError(error)) throw error;
    return prisma.targetCollectionJob.findFirst({
      where: { projectId, jobType: "INITIAL" },
      orderBy: { createdAt: "desc" },
      select: JOB_BASE_SELECT,
    });
  }
}

export async function getCompaniesForJob(jobId: string) {
  const sources = await prisma.companySource.findMany({
    where: { discoveredReason: { contains: `job:${jobId}|` } },
    select: { companyId: true },
  });
  return sources.map((source) => source.companyId);
}

export function filterSourcesByJobId<T extends { discoveredReason: string }>(
  sources: T[],
  jobId: string,
) {
  return sources.filter(
    (source) => jobIdFromDiscoveredReason(source.discoveredReason) === jobId,
  );
}

function collectionStatusLabel(status: string) {
  switch (status) {
    case CollectionJobStatus.QUEUED:
      return "대기";
    case CollectionJobStatus.RUNNING:
      return "실행 중";
    case CollectionJobStatus.COMPLETED:
      return "완료";
    case CollectionJobStatus.FAILED:
      return "실패";
    case CollectionJobStatus.CANCELLED:
      return "취소";
    case CollectionJobStatus.CANCEL_REQUESTED:
      return "취소 요청";
    case CollectionJobStatus.DRY_RUN:
      return "미리보기";
    default:
      return status;
  }
}
