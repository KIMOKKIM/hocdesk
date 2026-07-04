import { prisma } from "@/lib/prisma";
import {
  companyStatusLabels,
  reviewStatusLabels,
} from "@/lib/constants/labels";
import { CompanyStatus, ReviewStatus } from "@/lib/constants/status";
import { formatDateTime } from "@/lib/format";
import {
  confidenceLabel,
  isDemoCompany,
  sourceTypeLabel,
} from "@/lib/collection/source-display";
import { resolveIncludeDemo } from "@/lib/demo-filter";

export type TargetFilters = {
  q?: string;
  industry?: string;
  region?: string;
  grade?: string;
  status?: string;
  projectId?: string;
  sourceType?: string;
  collectedFrom?: string;
  collectedTo?: string;
  hasContact?: string;
  hasEmail?: string;
  includeDemo?: string;
};

function buildContactFilter(hasContact?: string) {
  if (!hasContact || hasContact === "ALL") return undefined;
  const contactCondition = {
    OR: [
      { mainPhone: { not: null } },
      { generalEmail: { not: null } },
      {
        contacts: {
          some: {
            OR: [{ email: { not: null } }, { mobile: { not: null } }],
          },
        },
      },
    ],
  };
  if (hasContact === "YES") return contactCondition;
  return { NOT: contactCondition };
}

function buildEmailFilter(hasEmail?: string) {
  if (!hasEmail || hasEmail === "ALL") return undefined;
  const emailCondition = {
    OR: [
      { generalEmail: { not: null } },
      { contacts: { some: { email: { not: null } } } },
    ],
  };
  if (hasEmail === "YES") return emailCondition;
  return { NOT: emailCondition };
}

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

export async function getTargetFilterOptions() {
  const [industries, regions, grades, sourceTypes] = await Promise.all([
    prisma.company.findMany({
      where: { status: { not: CompanyStatus.EXCLUDED } },
      select: { industryGroup: true },
      distinct: ["industryGroup"],
    }),
    prisma.company.findMany({
      where: { status: { not: CompanyStatus.EXCLUDED }, region: { not: null } },
      select: { region: true },
      distinct: ["region"],
    }),
    prisma.projectCompany.findMany({
      select: { targetGrade: true },
      distinct: ["targetGrade"],
    }),
    prisma.companySource.findMany({
      select: { sourceType: true },
      distinct: ["sourceType"],
    }),
  ]);

  return {
    industries: industries
      .map((item) => item.industryGroup)
      .filter(Boolean) as string[],
    regions: regions.map((item) => item.region).filter(Boolean) as string[],
    grades: grades.map((item) => item.targetGrade).sort(),
    sourceTypes: sourceTypes.map((item) => item.sourceType).sort(),
    statuses: Object.entries(reviewStatusLabels).map(([value, label]) => ({
      value,
      label,
    })),
  };
}

export async function getTargets(filters: TargetFilters = {}) {
  const collectedFrom = parseDateBoundary(filters.collectedFrom);
  const collectedTo = parseDateBoundary(filters.collectedTo, true);

  const sourceFilter =
    filters.sourceType && filters.sourceType !== "ALL"
      ? {
          some: {
            sourceType: filters.sourceType,
            ...(collectedFrom || collectedTo
              ? {
                  collectedAt: {
                    ...(collectedFrom ? { gte: collectedFrom } : {}),
                    ...(collectedTo ? { lte: collectedTo } : {}),
                  },
                }
              : {}),
          },
        }
      : collectedFrom || collectedTo
        ? {
            some: {
              collectedAt: {
                ...(collectedFrom ? { gte: collectedFrom } : {}),
                ...(collectedTo ? { lte: collectedTo } : {}),
              },
            },
          }
        : undefined;

  const contactFilter = buildContactFilter(filters.hasContact);
  const emailFilter = buildEmailFilter(filters.hasEmail);

  const companyWhere = {
    status: { not: CompanyStatus.EXCLUDED },
    industryGroup:
      filters.industry && filters.industry !== "ALL"
        ? filters.industry
        : undefined,
    region:
      filters.region && filters.region !== "ALL" ? filters.region : undefined,
    sources: sourceFilter,
    ...(contactFilter ?? {}),
    ...(emailFilter ?? {}),
    OR: filters.q
      ? [
          { companyName: { contains: filters.q } },
          { detailedIndustry: { contains: filters.q } },
          { region: { contains: filters.q } },
        ]
      : undefined,
  };

  const where = {
    reviewStatus:
      filters.status && filters.status !== "ALL"
        ? filters.status
        : { not: ReviewStatus.EXCLUDED },
    targetGrade: filters.grade && filters.grade !== "ALL" ? filters.grade : undefined,
    projectId: filters.projectId || undefined,
    company: companyWhere,
  };

  const targets = await prisma.projectCompany.findMany({
    where,
    orderBy: [{ targetGrade: "asc" }, { fitScore: "desc" }],
    include: {
      company: {
        include: {
          contacts: true,
          sources: {
            orderBy: { collectedAt: "desc" },
            take: 1,
          },
        },
      },
      project: { select: { name: true } },
    },
  });

  return targets
    .map((target) => {
    const hasContact =
      Boolean(target.company.mainPhone || target.company.generalEmail) ||
      target.company.contacts.some(
        (contact) => contact.email || contact.mobile,
      );
    const hasEmail =
      Boolean(target.company.generalEmail) ||
      target.company.contacts.some((contact) => contact.email);
    const hasVerifiedEmail = target.company.contacts.some(
      (contact) => contact.verified && contact.email,
    );

    const latestSource = target.company.sources[0];
    const isDemo = isDemoCompany(
      target.company.companyName,
      latestSource?.sourceType,
      latestSource?.rawMetadata,
    );

    return {
      id: target.id,
      companyId: target.companyId,
      companyName: target.company.companyName,
      targetGrade: target.targetGrade,
      industryGroup: target.company.industryGroup,
      detailedIndustry: target.company.detailedIndustry,
      region: target.company.region,
      estimatedRevenue: target.company.estimatedRevenue,
      fitScore: target.fitScore,
      reviewStatus: target.reviewStatus,
      reviewStatusLabel:
        reviewStatusLabels[target.reviewStatus] ?? target.reviewStatus,
      companyStatus: target.company.status,
      companyStatusLabel:
        companyStatusLabels[target.company.status] ?? target.company.status,
      projectName: target.project.name,
      latestSourceType: latestSource?.sourceType ?? null,
      latestSourceLabel: sourceTypeLabel(latestSource?.sourceType),
      latestProvider: latestSource?.provider ?? null,
      latestSourceConfidence: latestSource?.sourceConfidence ?? null,
      latestSourceConfidenceLabel: confidenceLabel(latestSource?.sourceConfidence),
      latestSearchKeyword: latestSource?.searchKeyword ?? null,
      latestSourceUrl: latestSource?.sourceUrl ?? null,
      isDemo,
      latestCollectedAt: latestSource?.collectedAt
        ? formatDateTime(latestSource.collectedAt)
        : null,
      hasContact,
      hasEmail,
      hasVerifiedEmail,
      hasPhone: Boolean(target.company.mainPhone),
      hasWebsite: Boolean(target.company.website),
    };
  })
    .filter((target) =>
      resolveIncludeDemo(filters.includeDemo) ? true : !target.isDemo,
    );
}

export async function getTargetById(id: string) {
  const target = await prisma.projectCompany.findUnique({
    where: { id },
    include: {
      company: {
        include: {
          contacts: true,
          sources: { orderBy: { collectedAt: "desc" } },
        },
      },
      project: true,
    },
  });

  if (!target) return null;

  const outreachs = await prisma.outreach.findMany({
    where: {
      projectId: target.projectId,
      companyId: target.companyId,
    },
    orderBy: { createdAt: "desc" },
    include: { contact: true },
  });

  const lastOutreach = outreachs.find((item) => item.sentAt);
  const outreachNextAction = outreachs.find((item) => item.nextActionDate);

  const hasContact =
    Boolean(target.company.mainPhone || target.company.generalEmail) ||
    target.company.contacts.some((contact) => contact.email || contact.mobile);
  const hasVerifiedEmail = target.company.contacts.some(
    (contact) => contact.verified && contact.email,
  );

  const primarySource = target.company.sources[0];
  const isDemo = isDemoCompany(
    target.company.companyName,
    primarySource?.sourceType,
    primarySource?.rawMetadata,
  );

  return {
    ...target,
    reviewStatusLabel:
      reviewStatusLabels[target.reviewStatus] ?? target.reviewStatus,
    companyStatusLabel:
      companyStatusLabels[target.company.status] ?? target.company.status,
    outreachs,
    hasContact,
    hasVerifiedEmail,
    hasEmail:
      Boolean(target.company.generalEmail) ||
      target.company.contacts.some((contact) => contact.email),
    hasPhone: Boolean(target.company.mainPhone),
    hasWebsite: Boolean(target.company.website),
    isDemo,
    sourceTypeLabel: sourceTypeLabel(primarySource?.sourceType),
    sourceConfidenceLabel: confidenceLabel(primarySource?.sourceConfidence),
    primarySource,
    lastContactAt: lastOutreach?.sentAt
      ? formatDateTime(lastOutreach.sentAt)
      : null,
    nextActionDate: outreachNextAction?.nextActionDate
      ? formatDateTime(outreachNextAction.nextActionDate)
      : null,
  };
}

export async function getDefaultProjectId() {
  const project = await prisma.project.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  return project?.id ?? null;
}
