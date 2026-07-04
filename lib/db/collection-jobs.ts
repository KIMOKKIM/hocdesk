import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { CollectionJobStatus } from "@/lib/constants/status";
import { jobIdFromDiscoveredReason } from "@/lib/collection/duplicate-check";

export async function getCollectionJobsByProject(projectId: string) {
  const jobs = await prisma.targetCollectionJob.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return jobs.map((job) => {
    const plan = job.searchPlan as { provider?: string; requestedSegments?: string[] };
    return {
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      statusLabel: collectionStatusLabel(job.status),
      provider: plan.provider ?? "demo",
      requestedSegments: plan.requestedSegments ?? [],
      requestedCount: job.requestedCount,
      collectedCount: job.collectedCount,
      acceptedCount: job.acceptedCount,
      duplicateCount: job.duplicateCount,
      rejectedCount: job.rejectedCount,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt ? formatDateTime(job.startedAt) : null,
      completedAt: job.completedAt ? formatDateTime(job.completedAt) : null,
      createdAt: formatDateTime(job.createdAt),
    };
  });
}

export async function getCollectionJobDetail(jobId: string) {
  const job = await prisma.targetCollectionJob.findUnique({
    where: { id: jobId },
    include: { project: { select: { id: true, name: true } } },
  });

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
    searchPlan: job.searchPlan,
    jobStats: job.jobStats,
    requestedCount: job.requestedCount,
    collectedCount: job.collectedCount,
    acceptedCount: job.acceptedCount,
    duplicateCount: job.duplicateCount,
    rejectedCount: job.rejectedCount,
    gradeCounts,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt ? formatDateTime(job.startedAt) : null,
    completedAt: job.completedAt ? formatDateTime(job.completedAt) : null,
    createdAt: formatDateTime(job.createdAt),
    companies,
  };
}

export async function getLatestInitialJob(projectId: string) {
  return prisma.targetCollectionJob.findFirst({
    where: { projectId, jobType: "INITIAL" },
    orderBy: { createdAt: "desc" },
  });
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
    case CollectionJobStatus.DRY_RUN:
      return "미리보기";
    default:
      return status;
  }
}
