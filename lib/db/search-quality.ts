import { prisma } from "@/lib/prisma";

export async function getProjectSearchQuality(projectId: string) {
  const jobs = await prisma.targetCollectionJob.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  const realJobs = jobs.filter((job) => {
    const plan = job.searchPlan as { provider?: string };
    return plan.provider && plan.provider !== "demo";
  });

  const totals = {
    jobCount: realJobs.length,
    rawResults: 0,
    accepted: 0,
    duplicate: 0,
    rejected: 0,
    withPhone: 0,
    withUrl: 0,
    industryAccepted: 0,
    industryReview: 0,
    industryRejected: 0,
  };

  const byProvider: Record<string, number> = {};
  const bySegment: Record<
    string,
    { queries: number; raw: number; accepted: number; duplicate: number; rejected: number }
  > = {};

  for (const job of realJobs) {
    const plan = job.searchPlan as {
      provider?: string;
      requestedSegments?: string[];
      queryCount?: number;
    };
    const stats = (job.jobStats ?? {}) as {
      rawResultCount?: number;
      withPhone?: number;
      industryAccepted?: number;
      industryReview?: number;
      industryRejected?: number;
    };

    const provider = plan.provider ?? "unknown";
    byProvider[provider] = (byProvider[provider] ?? 0) + 1;

    totals.rawResults += stats.rawResultCount ?? job.collectedCount;
    totals.accepted += job.acceptedCount;
    totals.duplicate += job.duplicateCount;
    totals.rejected += job.rejectedCount;
    totals.withPhone += stats.withPhone ?? 0;
    totals.industryAccepted += stats.industryAccepted ?? 0;
    totals.industryReview += stats.industryReview ?? 0;
    totals.industryRejected += stats.industryRejected ?? 0;

    for (const segment of plan.requestedSegments ?? []) {
      if (!bySegment[segment]) {
        bySegment[segment] = {
          queries: 0,
          raw: 0,
          accepted: 0,
          duplicate: 0,
          rejected: 0,
        };
      }
      bySegment[segment].queries += plan.queryCount ?? 0;
      bySegment[segment].raw += stats.rawResultCount ?? 0;
      bySegment[segment].accepted += job.acceptedCount;
      bySegment[segment].duplicate += job.duplicateCount;
      bySegment[segment].rejected += job.rejectedCount;
    }
  }

  const candidates = await prisma.discoveredCandidate.groupBy({
    by: ["validationStatus"],
    where: { projectId },
    _count: true,
  });

  const processed = totals.accepted + totals.duplicate + totals.rejected;
  const acceptRate =
    totals.industryAccepted + totals.industryReview + totals.industryRejected > 0
      ? Math.round(
          (totals.industryAccepted /
            (totals.industryAccepted + totals.industryReview + totals.industryRejected)) *
            100,
        )
      : 0;

  return {
    totals: {
      ...totals,
      acceptRate,
      duplicateRate: processed > 0 ? Math.round((totals.duplicate / processed) * 100) : 0,
      rejectRate: processed > 0 ? Math.round((totals.rejected / processed) * 100) : 0,
      newRegistrationRate:
        processed > 0 ? Math.round((totals.accepted / processed) * 100) : 0,
      phoneRate:
        totals.accepted > 0 ? Math.round((totals.withPhone / totals.accepted) * 100) : 0,
    },
    byProvider,
    bySegment: Object.entries(bySegment).map(([segment, data]) => ({ segment, ...data })),
    candidateBreakdown: candidates,
    recentJobs: realJobs.slice(0, 10).map((job) => ({
      id: job.id,
      status: job.status,
      provider: (job.searchPlan as { provider?: string }).provider ?? "demo",
      acceptedCount: job.acceptedCount,
      duplicateCount: job.duplicateCount,
      rejectedCount: job.rejectedCount,
      createdAt: job.createdAt,
    })),
  };
}
