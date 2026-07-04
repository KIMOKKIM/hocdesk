import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  activityResultLabels,
  activityTypeLabels,
} from "@/lib/constants/activity";

export type CreateActivityInput = {
  projectId: string;
  activityDate: string;
  rawText: string;
  activityType: string;
  result?: string | null;
  contactedCompanyIds?: string[];
  nextActionDate?: string | null;
  memo?: string | null;
};

export async function createActivity(input: CreateActivityInput) {
  return prisma.dailyActivity.create({
    data: {
      projectId: input.projectId,
      activityDate: new Date(input.activityDate),
      rawText: input.rawText,
      activityType: input.activityType,
      result: input.result ?? null,
      contactedCompanyIds: input.contactedCompanyIds ?? [],
      nextActionDate: input.nextActionDate
        ? new Date(input.nextActionDate)
        : null,
      memo: input.memo ?? null,
    },
  });
}

export async function getActivities() {
  const activities = await prisma.dailyActivity.findMany({
    orderBy: { activityDate: "desc" },
    include: {
      project: { select: { name: true } },
      targetExpansionSuggestions: {
        select: { id: true, segmentName: true, status: true },
      },
    },
  });

  return activities.map((activity) => ({
    id: activity.id,
    projectId: activity.projectId,
    projectName: activity.project.name,
    activityDate: formatDate(activity.activityDate),
    rawText: activity.rawText,
    summary: activity.summary,
    activityType: activity.activityType,
    activityTypeLabel:
      activityTypeLabels[activity.activityType] ?? activity.activityType,
    result: activity.result,
    resultLabel: activity.result
      ? (activityResultLabels[activity.result] ?? activity.result)
      : null,
    hasAnalysis: Boolean(activity.aiAnalysis),
    suggestionCount: activity.targetExpansionSuggestions.length,
    createdAt: formatDateTime(activity.createdAt),
  }));
}

export async function getActivityById(id: string) {
  return prisma.dailyActivity.findUnique({
    where: { id },
    include: {
      project: true,
      targetExpansionSuggestions: true,
    },
  });
}

export async function getProjectCompaniesForSelect(projectId: string) {
  const links = await prisma.projectCompany.findMany({
    where: { projectId, reviewStatus: { not: "EXCLUDED" } },
    include: { company: { select: { id: true, companyName: true } } },
    orderBy: { fitScore: "desc" },
  });

  return links.map((link) => ({
    value: link.company.id,
    label: link.company.companyName,
  }));
}

export async function getContactedCompanyNames(ids: string[]) {
  if (ids.length === 0) return [];
  const companies = await prisma.company.findMany({
    where: { id: { in: ids } },
    select: { companyName: true },
  });
  return companies.map((c) => c.companyName);
}
