import { jobIdFromDiscoveredReason } from "@/lib/collection/duplicate-check";
import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export async function getRecentSearchKeywordWarnings(queries: string[]) {
  const since = new Date();
  since.setDate(since.getDate() - COLLECTION_LIMITS.repeatSearchWaitDays);

  const warnings = [];

  for (const query of queries) {
    const source = await prisma.companySource.findFirst({
      where: {
        searchKeyword: query,
        collectedAt: { gte: since },
      },
      orderBy: { collectedAt: "desc" },
    });

    if (!source) continue;

    const jobId = jobIdFromDiscoveredReason(source.discoveredReason ?? "");
    let jobStats = { acceptedCount: 0, duplicateCount: 0 };

    if (jobId) {
      const job = await prisma.targetCollectionJob.findUnique({
        where: { id: jobId },
        select: { acceptedCount: true, duplicateCount: true },
      });
      if (job) jobStats = job;
    }

    warnings.push({
      query,
      lastRunAt: formatDateTime(source.collectedAt),
      acceptedCount: jobStats.acceptedCount,
      duplicateCount: jobStats.duplicateCount,
      jobId: jobId ?? null,
    });
  }

  return warnings;
}
