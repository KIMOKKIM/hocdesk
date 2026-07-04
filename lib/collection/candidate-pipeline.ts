import type { Prisma } from "@/app/generated/prisma/client";
import {
  buildSourceDiscoveredReason,
  findDuplicateCompany,
  sourceRecordExists,
} from "@/lib/collection/duplicate-check";
import { saveDiscoveredCandidate } from "@/lib/collection/discovered-candidate-service";
import type { SearchCandidate } from "@/lib/collection/types";
import { writeActivityLog } from "@/lib/audit/activity-log-service";
import { CompanyStatus, ReviewStatus } from "@/lib/constants/status";
import { normalizeCompanyName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type CandidateProcessResult =
  | { action: "queued" }
  | { action: "imported"; companyId: string }
  | { action: "duplicate" }
  | { action: "rejected"; reason: string };

type ProcessOptions = {
  candidate: SearchCandidate;
  projectId: string;
  jobId: string;
  isExternal: boolean;
  dryRun: boolean;
  importMode: "review" | "fast";
};

function buildSourceRecord(
  companyId: string,
  jobId: string,
  candidate: SearchCandidate,
  tag: string,
) {
  return {
    companyId,
    sourceType: candidate.sourceType || "COLLECTION_JOB",
    sourceUrl: candidate.sourceUrl ?? candidate.placeUrl ?? null,
    searchKeyword: candidate.searchKeyword,
    provider: candidate.provider ?? null,
    externalId: candidate.externalId ?? null,
    sourceConfidence: candidate.sourceConfidence ?? null,
    rawMetadata: (candidate.rawMetadata ?? {}) as Prisma.InputJsonValue,
    discoveredReason: buildSourceDiscoveredReason(
      jobId,
      `${tag}: ${candidate.discoveredReason}`,
    ),
  };
}

function buildProjectCompanyData(
  projectId: string,
  companyId: string,
  candidate: SearchCandidate,
) {
  return {
    projectId,
    companyId,
    targetGrade: candidate.targetGrade ?? "C",
    fitScore: candidate.fitScore ?? 0,
    financialScore: candidate.financialScore ?? 0,
    locationScore: candidate.locationScore ?? 0,
    facilityNeedScore: candidate.facilityNeedScore ?? 0,
    expansionSignalScore: candidate.expansionSignalScore ?? 0,
    decisionMakerScore: candidate.decisionMakerScore ?? 0,
    recommendedUse: candidate.recommendedUse ?? null,
    targetingReason: candidate.targetingReason ?? null,
    riskFactors: candidate.riskFactors ?? null,
    reviewStatus: ReviewStatus.PENDING,
  };
}

export async function processCollectionCandidate(
  options: ProcessOptions,
): Promise<CandidateProcessResult> {
  const { candidate, projectId, jobId, isExternal, dryRun, importMode } = options;
  const useReviewQueue = isExternal && (importMode === "review" || dryRun);

  const duplicate = await findDuplicateCompany(candidate);
  if (duplicate.isDuplicate) {
    if (useReviewQueue) {
      await saveDiscoveredCandidate({
        projectId,
        collectionJobId: jobId,
        candidate,
        isDuplicate: true,
        duplicateCompanyId: duplicate.existingCompanyId,
      });
      return { action: "duplicate" };
    }

    if (duplicate.existingCompanyId) {
      const sourceExists = await sourceRecordExists(
        duplicate.existingCompanyId,
        candidate,
      );
      if (!sourceExists) {
        await prisma.companySource.create({
          data: buildSourceRecord(
            duplicate.existingCompanyId,
            jobId,
            candidate,
            duplicate.reason ?? "duplicate",
          ),
        });
      }
      const existingLink = await prisma.projectCompany.findUnique({
        where: {
          projectId_companyId: {
            projectId,
            companyId: duplicate.existingCompanyId,
          },
        },
      });
      if (!existingLink) {
        await prisma.projectCompany.create({
          data: buildProjectCompanyData(
            projectId,
            duplicate.existingCompanyId,
            candidate,
          ),
        });
      }
    }
    return { action: "duplicate" };
  }

  if (useReviewQueue) {
    await saveDiscoveredCandidate({
      projectId,
      collectionJobId: jobId,
      candidate,
    });
    return { action: "queued" };
  }

  if (isExternal && importMode === "fast" && candidate.industryValidation !== "ACCEPT") {
    return { action: "rejected", reason: "빠른 등록은 ACCEPT만 허용" };
  }

  const company = await prisma.company.create({
    data: {
      companyName: candidate.companyName,
      normalizedName: normalizeCompanyName(candidate.companyName),
      industryGroup: candidate.industryGroup ?? null,
      detailedIndustry: candidate.detailedIndustry ?? null,
      region: candidate.region ?? null,
      address: candidate.address ?? null,
      mainPhone: candidate.mainPhone ?? null,
      website: candidate.website ?? null,
      generalEmail: candidate.generalEmail ?? null,
      status: CompanyStatus.NEW,
    },
  });

  await prisma.projectCompany.create({
    data: buildProjectCompanyData(projectId, company.id, candidate),
  });

  await prisma.companySource.create({
    data: buildSourceRecord(company.id, jobId, candidate, "new"),
  });

  await writeActivityLog({
    eventType: isExternal ? "EXTERNAL_COMPANY_CREATED" : "COMPANY_CREATED",
    summary: `업체 등록: ${company.companyName}`,
    projectId,
    companyId: company.id,
    collectionJobId: jobId,
  });

  return { action: "imported", companyId: company.id };
}
