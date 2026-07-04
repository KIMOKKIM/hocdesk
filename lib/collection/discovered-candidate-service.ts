import type { Prisma } from "@/app/generated/prisma/client";
import type { SearchCandidate } from "@/lib/collection/types";
import { DiscoveredCandidateStatus } from "@/lib/constants/status";
import { normalizeCompanyName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { writeActivityLog } from "@/lib/audit/activity-log-service";

function mapValidationToStatus(
  industryValidation?: string | null,
  isDuplicate?: boolean,
): string {
  if (isDuplicate) return DiscoveredCandidateStatus.DUPLICATE;
  if (industryValidation === "ACCEPT") return DiscoveredCandidateStatus.ACCEPTED;
  if (industryValidation === "REVIEW") return DiscoveredCandidateStatus.REVIEW_REQUIRED;
  if (industryValidation === "REJECT") return DiscoveredCandidateStatus.REJECTED;
  return DiscoveredCandidateStatus.DISCOVERED;
}

export async function saveDiscoveredCandidate(params: {
  projectId: string;
  collectionJobId?: string;
  candidate: SearchCandidate;
  isDuplicate?: boolean;
  duplicateCompanyId?: string | null;
}) {
  const { candidate, projectId, collectionJobId } = params;
  const validationStatus = mapValidationToStatus(
    candidate.industryValidation,
    params.isDuplicate,
  );

  const record = await prisma.discoveredCandidate.create({
    data: {
      projectId,
      collectionJobId: collectionJobId ?? null,
      provider: candidate.provider ?? "unknown",
      externalId: candidate.externalId ?? null,
      companyName: candidate.companyName,
      normalizedName: normalizeCompanyName(candidate.companyName),
      industryGroup: candidate.industryGroup ?? null,
      segmentName: candidate.detailedIndustry ?? null,
      categoryName: candidate.categoryName ?? null,
      categoryGroupName: candidate.categoryGroupName ?? null,
      phone: candidate.mainPhone ?? null,
      address: candidate.address ?? null,
      roadAddress: candidate.roadAddress ?? null,
      region: candidate.region ?? null,
      placeUrl: candidate.sourceUrl ?? candidate.placeUrl ?? null,
      searchKeyword: candidate.searchKeyword,
      sourceConfidence: candidate.sourceConfidence ?? null,
      validationStatus,
      validationScore:
        typeof candidate.rawMetadata === "object" &&
        candidate.rawMetadata &&
        "validationScore" in candidate.rawMetadata
          ? Number((candidate.rawMetadata as { validationScore?: number }).validationScore)
          : 0,
      rejectionReason:
        validationStatus === DiscoveredCandidateStatus.REJECTED
          ? candidate.industryValidation ?? "REJECT"
          : null,
      isDuplicate: params.isDuplicate ?? false,
      fitScore: candidate.fitScore ?? 0,
      targetGrade: candidate.targetGrade ?? null,
      recommendedUse: candidate.recommendedUse ?? null,
      targetingReason: candidate.targetingReason ?? null,
      rawMetadata: (candidate.rawMetadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  await writeActivityLog({
    eventType: "SEARCH_CANDIDATE_CREATED",
    summary: `검색 후보 등록: ${candidate.companyName}`,
    projectId,
    collectionJobId,
    metadata: {
      candidateId: record.id,
      validationStatus,
      provider: candidate.provider,
    },
  });

  return record;
}

export async function getDiscoveredCandidates(filters: {
  projectId?: string;
  validationStatus?: string;
  provider?: string;
  segmentName?: string;
  region?: string;
  hasPhone?: string;
  isDuplicate?: string;
  collectionJobId?: string;
  limit?: number;
}) {
  return prisma.discoveredCandidate.findMany({
    where: {
      projectId: filters.projectId || undefined,
      collectionJobId: filters.collectionJobId || undefined,
      validationStatus:
        filters.validationStatus && filters.validationStatus !== "ALL"
          ? filters.validationStatus
          : undefined,
      provider:
        filters.provider && filters.provider !== "ALL" ? filters.provider : undefined,
      segmentName:
        filters.segmentName && filters.segmentName !== "ALL"
          ? filters.segmentName
          : undefined,
      region:
        filters.region && filters.region !== "ALL" ? { contains: filters.region } : undefined,
      phone:
        filters.hasPhone === "YES"
          ? { not: null }
          : filters.hasPhone === "NO"
            ? null
            : undefined,
      isDuplicate:
        filters.isDuplicate === "YES"
          ? true
          : filters.isDuplicate === "NO"
            ? false
            : undefined,
    },
    orderBy: { discoveredAt: "desc" },
    take: filters.limit ?? 100,
    include: { project: { select: { name: true } } },
  });
}

export async function updateDiscoveredCandidateStatus(
  ids: string[],
  status: string,
  rejectionReason?: string,
) {
  return prisma.discoveredCandidate.updateMany({
    where: { id: { in: ids }, validationStatus: { not: DiscoveredCandidateStatus.IMPORTED } },
    data: {
      validationStatus: status,
      rejectionReason: rejectionReason ?? null,
      reviewedAt: new Date(),
    },
  });
}
