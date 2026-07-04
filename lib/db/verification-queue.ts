import { isDemoCompany } from "@/lib/collection/source-display";
import { CompanyStatus, ReviewStatus } from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

function verificationPriority(params: {
  targetGrade: string;
  hasPhone: boolean;
  hasPlaceUrl: boolean;
  region: string | null;
  hasEmail: boolean;
  hasWebsite: boolean;
  discoveredAt: Date;
  hasOutreach: boolean;
}) {
  let score = 0;
  if (params.targetGrade === "A") score += 30;
  if (params.hasPhone) score += 15;
  if (params.hasPlaceUrl) score += 10;
  if (params.region?.includes("양주")) score += 10;
  if (!params.hasEmail) score += 10;
  if (!params.hasWebsite) score += 5;
  const days = (Date.now() - params.discoveredAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) score += 5;
  if (!params.hasOutreach) score += 5;
  return score;
}

export async function getVerificationQueue(limit = 50) {
  const targets = await prisma.projectCompany.findMany({
    where: {
      reviewStatus: { in: [ReviewStatus.PENDING, ReviewStatus.REVIEWED] },
      company: {
        status: { in: [CompanyStatus.NEW, CompanyStatus.VALIDATED] },
        OR: [{ website: null }, { generalEmail: null }],
      },
    },
    include: {
      company: {
        include: {
          sources: { orderBy: { collectedAt: "desc" }, take: 1 },
          outreachs: { take: 1 },
        },
      },
      project: { select: { name: true } },
    },
    take: 200,
  });

  const items = targets
    .filter(
      (item) =>
        !isDemoCompany(
          item.company.companyName,
          item.company.sources[0]?.sourceType,
          item.company.sources[0]?.rawMetadata,
        ),
    )
    .map((item) => {
      const source = item.company.sources[0];
      const priority = verificationPriority({
        targetGrade: item.targetGrade,
        hasPhone: Boolean(item.company.mainPhone),
        hasPlaceUrl: Boolean(source?.sourceUrl),
        region: item.company.region,
        hasEmail: Boolean(item.company.generalEmail),
        hasWebsite: Boolean(item.company.website),
        discoveredAt: source?.collectedAt ?? item.createdAt,
        hasOutreach: item.company.outreachs.length > 0,
      });

      return {
        id: item.id,
        companyId: item.companyId,
        companyName: item.company.companyName,
        projectName: item.project.name,
        industryGroup: item.company.industryGroup,
        region: item.company.region,
        targetGrade: item.targetGrade,
        fitScore: item.fitScore,
        reviewStatus: item.reviewStatus,
        mainPhone: item.company.mainPhone,
        website: item.company.website,
        generalEmail: item.company.generalEmail,
        lastVerifiedAt: item.company.lastVerifiedAt
          ? formatDateTime(item.company.lastVerifiedAt)
          : null,
        sourceUrl: source?.sourceUrl ?? null,
        sourceType: source?.sourceType ?? null,
        priority,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return {
    items,
    topRecommendations: items.slice(0, 10),
  };
}
