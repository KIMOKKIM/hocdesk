import type { Prisma } from "@/app/generated/prisma/client";
import { buildSourceDiscoveredReason } from "@/lib/collection/duplicate-check";
import type { SearchCandidate } from "@/lib/collection/types";
import { writeActivityLog } from "@/lib/audit/activity-log-service";
import { DiscoveredCandidateStatus, CompanyStatus, ReviewStatus } from "@/lib/constants/status";
import { normalizeCompanyName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const MAX_IMPORT_BATCH = 30;

export async function importDiscoveredCandidates(
  candidateIds: string[],
  jobId?: string,
) {
  if (candidateIds.length === 0) {
    throw new Error("등록할 후보를 선택하세요.");
  }
  if (candidateIds.length > MAX_IMPORT_BATCH) {
    throw new Error(`한 번에 최대 ${MAX_IMPORT_BATCH}개까지 등록할 수 있습니다.`);
  }

  const candidates = await prisma.discoveredCandidate.findMany({
    where: {
      id: { in: candidateIds },
      validationStatus: {
        in: [
          DiscoveredCandidateStatus.ACCEPTED,
          DiscoveredCandidateStatus.REVIEW_REQUIRED,
          DiscoveredCandidateStatus.DISCOVERED,
        ],
      },
    },
  });

  if (candidates.length === 0) {
    throw new Error("등록 가능한 후보가 없습니다.");
  }

  const imported: string[] = [];

  for (const item of candidates) {
    const searchCandidate: SearchCandidate = {
      companyName: item.companyName,
      industryGroup: item.industryGroup,
      detailedIndustry: item.segmentName,
      region: item.region,
      address: item.address,
      mainPhone: item.phone,
      website: null,
      generalEmail: null,
      sourceType: item.provider === "kakao" ? "KAKAO_LOCAL" : "COLLECTION_JOB",
      sourceUrl: item.placeUrl,
      searchKeyword: item.searchKeyword ?? "",
      discoveredReason: `import:${item.id}`,
      provider: item.provider,
      externalId: item.externalId,
      sourceConfidence: item.sourceConfidence,
      recommendedUse: item.recommendedUse,
      targetingReason: item.targetingReason,
      fitScore: item.fitScore,
      targetGrade: item.targetGrade ?? undefined,
      isDemo: false,
    };

    const company = await prisma.company.create({
      data: {
        companyName: item.companyName,
        normalizedName: normalizeCompanyName(item.companyName),
        industryGroup: item.industryGroup,
        detailedIndustry: item.segmentName,
        region: item.region,
        address: item.address,
        mainPhone: item.phone,
        website: null,
        generalEmail: null,
        status: CompanyStatus.NEW,
      },
    });

    await prisma.projectCompany.create({
      data: {
        projectId: item.projectId,
        companyId: company.id,
        targetGrade: item.targetGrade ?? "C",
        fitScore: item.fitScore,
        recommendedUse: item.recommendedUse,
        targetingReason: item.targetingReason,
        reviewStatus: ReviewStatus.PENDING,
      },
    });

    await prisma.companySource.create({
      data: {
        companyId: company.id,
        sourceType: searchCandidate.sourceType,
        sourceUrl: item.placeUrl,
        searchKeyword: item.searchKeyword,
        provider: item.provider,
        externalId: item.externalId,
        sourceConfidence: item.sourceConfidence,
        rawMetadata: item.rawMetadata as Prisma.InputJsonValue,
        discoveredReason: buildSourceDiscoveredReason(
          jobId ?? item.collectionJobId ?? "import",
          `imported: ${item.companyName}`,
        ),
      },
    });

    await prisma.discoveredCandidate.update({
      where: { id: item.id },
      data: {
        validationStatus: DiscoveredCandidateStatus.IMPORTED,
        importedAt: new Date(),
        importedCompanyId: company.id,
      },
    });

    await writeActivityLog({
      eventType: "COMPANY_IMPORTED",
      summary: `후보 승인 등록: ${item.companyName}`,
      projectId: item.projectId,
      companyId: company.id,
      collectionJobId: item.collectionJobId,
      metadata: { candidateId: item.id },
    });

    imported.push(company.id);
  }

  return { importedCount: imported.length, companyIds: imported };
}
