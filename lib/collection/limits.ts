import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import { CompanyStatus, ReviewStatus } from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function countTodayNewCollectedCompanies() {
  return prisma.company.count({
    where: {
      createdAt: { gte: startOfToday() },
      status: CompanyStatus.NEW,
      sources: {
        some: {
          sourceType: { in: ["DEMO_SEARCH", "COLLECTION_JOB", "KAKAO_LOCAL"] },
        },
      },
    },
  });
}

export async function countPendingReview(projectId: string) {
  return prisma.projectCompany.count({
    where: {
      projectId,
      reviewStatus: ReviewStatus.PENDING,
    },
  });
}

export async function assertCollectionLimits(projectId: string) {
  const [todayCount, pendingReview] = await Promise.all([
    countTodayNewCollectedCompanies(),
    countPendingReview(projectId),
  ]);

  if (pendingReview >= COLLECTION_LIMITS.maxPendingReview) {
    throw new Error(
      `검토 대기 ${pendingReview}건으로 한도(${COLLECTION_LIMITS.maxPendingReview}건) 이상입니다. 신규 수집을 중단합니다.`,
    );
  }

  if (todayCount >= COLLECTION_LIMITS.maxNewCompaniesPerDay) {
    throw new Error(
      `오늘 신규 등록 ${todayCount}건으로 일일 한도(${COLLECTION_LIMITS.maxNewCompaniesPerDay}건)에 도달했습니다.`,
    );
  }

  return {
    todayCount,
    pendingReview,
    remainingDaily: COLLECTION_LIMITS.maxNewCompaniesPerDay - todayCount,
  };
}

export async function getCollectionPanelStats(projectId: string) {
  const [todayCount, pendingReview, latestJob] = await Promise.all([
    countTodayNewCollectedCompanies(),
    countPendingReview(projectId),
    prisma.targetCollectionJob.findFirst({
      where: { projectId, jobType: "INITIAL" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    todayCount,
    pendingReview,
    lastCollectionAt: latestJob?.completedAt ?? latestJob?.createdAt ?? null,
    lastJobStatus: latestJob?.status ?? null,
    lastAcceptedCount: latestJob?.acceptedCount ?? 0,
    lastDuplicateCount: latestJob?.duplicateCount ?? 0,
    lastRejectedCount: latestJob?.rejectedCount ?? 0,
  };
}

export async function getActiveInitialJob(projectId: string) {
  return prisma.targetCollectionJob.findFirst({
    where: {
      projectId,
      jobType: "INITIAL",
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });
}

export async function getCompletedInitialJob(projectId: string) {
  return prisma.targetCollectionJob.findFirst({
    where: {
      projectId,
      jobType: "INITIAL",
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
  });
}
