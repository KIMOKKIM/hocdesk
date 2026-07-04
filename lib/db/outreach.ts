import {
  OutreachApprovalStatus,
  OutreachStatus,
} from "@/lib/constants/status";
import { prisma } from "@/lib/prisma";
import { OUTREACH_LIMITS } from "@/lib/config/outreach-limits";
import { demoCompanyExcludeWhere, resolveIncludeDemo } from "@/lib/demo-filter";

export type OutreachFilters = {
  tab?: string;
  approvalStatus?: string;
  status?: string;
  projectId?: string;
  q?: string;
  sort?: string;
  includeDemo?: string;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOutreachStats(projectId?: string) {
  const where = projectId ? { projectId } : {};

  const [approvalGroups, statusGroups, todaySent, scheduled, nextAction, suppressed] =
    await Promise.all([
      prisma.outreach.groupBy({
        by: ["approvalStatus"],
        where,
        _count: { _all: true },
      }),
      prisma.outreach.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      prisma.outreach.count({
        where: { ...where, status: OutreachStatus.SENT, sentAt: { gte: startOfToday() } },
      }),
      prisma.outreach.count({
        where: { ...where, status: OutreachStatus.SCHEDULED },
      }),
      prisma.outreach.count({
        where: {
          ...where,
          nextActionDate: { lte: new Date(), not: null },
          status: { in: [OutreachStatus.SENT, OutreachStatus.REPLIED] },
        },
      }),
      prisma.suppressionList.count(),
    ]);

  const approval: Record<string, number> = {};
  for (const g of approvalGroups) approval[g.approvalStatus] = g._count._all;

  const status: Record<string, number> = {};
  for (const g of statusGroups) status[g.status] = g._count._all;

  const total = Object.values(status).reduce((sum, n) => sum + n, 0);
  const sent = status[OutreachStatus.SENT] ?? 0;
  const replied = status[OutreachStatus.REPLIED] ?? 0;
  const approved = approval[OutreachApprovalStatus.APPROVED] ?? 0;
  const pending = approval[OutreachApprovalStatus.PENDING] ?? 0;
  const drafts = approval[OutreachApprovalStatus.DRAFT] ?? 0;

  return {
    draft: drafts,
    pending,
    approved,
    scheduled,
    sent,
    replied,
    failed: status[OutreachStatus.FAILED] ?? 0,
    cancelled: status[OutreachStatus.CANCELLED] ?? 0,
    todaySent,
    nextAction,
    suppressed,
    total,
    approvalRate:
      pending + approved > 0
        ? Math.round((approved / (pending + approved)) * 100)
        : 0,
    replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
  };
}

export async function getOutreachPerformance(
  projectId?: string,
  includeDemoParam?: string,
) {
  const includeDemo = resolveIncludeDemo(includeDemoParam);
  const where = projectId ? { projectId } : {};
  const all = await prisma.outreach.findMany({
    where,
    include: {
      company: {
        include: { sources: { orderBy: { collectedAt: "desc" }, take: 1 } },
      },
    },
  });
  const filtered = includeDemo
    ? all
    : all.filter((item) => {
        const source = item.company.sources[0];
        return !(
          item.company.companyName.includes("데모") ||
          source?.sourceType === "DEMO_SEARCH"
        );
      });
  return {
    created: filtered.length,
    sent: filtered.filter((item) => item.status === OutreachStatus.SENT || item.sentAt).length,
    replied: filtered.filter((item) => item.status === OutreachStatus.REPLIED).length,
    interestedReplies: filtered.filter((item) => item.replyType === "INTERESTED").length,
    rejectedReplies: filtered.filter(
      (item) => item.replyType === "REJECTED" || item.replyType === "UNSUBSCRIBE",
    ).length,
  };
}

function resolveTabFilter(tab?: string) {
  if (!tab || tab === "ALL") return {};
  switch (tab) {
    case "DRAFT":
      return { approvalStatus: OutreachApprovalStatus.DRAFT };
    case "PENDING":
      return { approvalStatus: OutreachApprovalStatus.PENDING };
    case "APPROVED":
      return { approvalStatus: OutreachApprovalStatus.APPROVED };
    case "SCHEDULED":
      return { status: OutreachStatus.SCHEDULED };
    case "SENT":
      return { status: OutreachStatus.SENT };
    case "REPLIED":
      return { status: OutreachStatus.REPLIED };
    case "FAILED":
      return { status: OutreachStatus.FAILED };
    case "CANCELLED":
      return { status: OutreachStatus.CANCELLED };
    default:
      return {};
  }
}

export async function getOutreachList(filters: OutreachFilters = {}) {
  const tabFilter = resolveTabFilter(filters.tab);

  const where = {
    projectId: filters.projectId || undefined,
    approvalStatus:
      filters.approvalStatus && filters.approvalStatus !== "ALL"
        ? filters.approvalStatus
        : tabFilter.approvalStatus,
    status:
      filters.status && filters.status !== "ALL"
        ? filters.status
        : tabFilter.status,
    OR: filters.q
      ? [
          { subject: { contains: filters.q } },
          { company: { companyName: { contains: filters.q } } },
        ]
      : undefined,
    ...(resolveIncludeDemo(filters.includeDemo)
      ? {}
      : { company: demoCompanyExcludeWhere() }),
  };

  const orderBy =
    filters.sort === "scheduled"
      ? [{ scheduledAt: "asc" as const }]
      : filters.sort === "nextAction"
        ? [{ nextActionDate: "asc" as const }]
        : [{ createdAt: "desc" as const }];

  return prisma.outreach.findMany({
    where,
    orderBy,
    include: {
      company: { select: { companyName: true, region: true } },
      project: { select: { name: true } },
      contact: { select: { contactName: true, email: true } },
    },
  });
}

export async function getRecentOutreach(
  limit = 5,
  includeDemoParam?: string,
  projectId?: string,
) {
  const includeDemo = resolveIncludeDemo(includeDemoParam);
  const items = await prisma.outreach.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
    include: {
      company: {
        select: {
          companyName: true,
          sources: { orderBy: { collectedAt: "desc" }, take: 1, select: { sourceType: true } },
        },
      },
      project: { select: { name: true } },
    },
  });
  return (includeDemo
    ? items
    : items.filter(
        (item) =>
          !item.company.companyName.includes("데모") &&
          item.company.sources[0]?.sourceType !== "DEMO_SEARCH",
      )
  ).slice(0, limit);
}

export async function getOutreachById(id: string) {
  const outreach = await prisma.outreach.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: true, sources: true } },
      project: true,
      contact: true,
    },
  });

  if (!outreach) return null;

  let projectCompany = null;
  if (outreach.projectCompanyId) {
    projectCompany = await prisma.projectCompany.findUnique({
      where: { id: outreach.projectCompanyId },
    });
  } else {
    projectCompany = await prisma.projectCompany.findFirst({
      where: {
        projectId: outreach.projectId,
        companyId: outreach.companyId,
      },
    });
  }

  return { ...outreach, projectCompany };
}

export async function getOutreachForTarget(projectCompanyId: string) {
  const target = await prisma.projectCompany.findUnique({
    where: { id: projectCompanyId },
    select: { projectId: true, companyId: true },
  });
  if (!target) return [];

  return prisma.outreach.findMany({
    where: {
      projectId: target.projectId,
      companyId: target.companyId,
    },
    orderBy: { createdAt: "desc" },
    include: { contact: true },
  });
}

export { OUTREACH_LIMITS };
