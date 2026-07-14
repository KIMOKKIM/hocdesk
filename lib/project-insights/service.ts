import "server-only";
import { writeActivityLog } from "@/lib/audit/activity-log-service";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import {
  PROJECT_INSIGHT_CATEGORIES,
  projectInsightCategoryLabels,
  type ProjectInsightCategoryValue,
} from "@/lib/project-insights/constants";
import { buildRuleBasedInsight } from "@/lib/project-insights/rule-based-updater";
import { seedProjectInsights } from "@/lib/project-insights/seed";
import { ApiError } from "@/lib/api/errors";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

export function parseInsightCategory(
  category: string,
): ProjectInsightCategoryValue {
  const upper = category.toUpperCase();
  if (
    !PROJECT_INSIGHT_CATEGORIES.includes(upper as ProjectInsightCategoryValue)
  ) {
    throw new ApiError("유효하지 않은 분석 카테고리입니다.", 400);
  }
  return upper as ProjectInsightCategoryValue;
}

export async function ensureProjectInsights(projectId: string) {
  const count = await prisma.projectInsight.count({ where: { projectId } });
  if (count === 0) {
    await seedProjectInsights(prisma, projectId);
  }
}

export async function getProjectInsights(projectId: string) {
  await ensureProjectInsights(projectId);

  const rows = await prisma.projectInsight.findMany({
    where: { projectId },
    orderBy: { category: "asc" },
  });

  const ordered = PROJECT_INSIGHT_CATEGORIES.map((category) => {
    const row = rows.find((item) => item.category === category);
    if (!row) return null;
    return mapInsight(row);
  }).filter(Boolean);

  return ordered as ReturnType<typeof mapInsight>[];
}

function mapInsight(row: {
  id: string;
  projectId: string;
  category: string;
  title: string;
  summary: string | null;
  keyIssues: unknown;
  saleImpact: string | null;
  opportunities: unknown;
  risks: unknown;
  sourceNotes: string | null;
  sourceUrls: unknown;
  lastUpdatedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category,
    title: row.title || projectInsightCategoryLabels[row.category as ProjectInsightCategoryValue] || row.category,
    summary: row.summary,
    keyIssues: asStringArray(row.keyIssues),
    saleImpact: row.saleImpact,
    opportunities: asStringArray(row.opportunities),
    risks: asStringArray(row.risks),
    sourceNotes: row.sourceNotes,
    sourceUrls: asStringArray(row.sourceUrls),
    lastUpdatedAt: row.lastUpdatedAt
      ? formatDateTime(row.lastUpdatedAt)
      : formatDateTime(row.updatedAt),
    lastUpdatedAtIso: (row.lastUpdatedAt ?? row.updatedAt).toISOString(),
  };
}

export type InsightUpdateContent = {
  summary?: string;
  keyIssues?: string[];
  saleImpact?: string;
  opportunities?: string[];
  risks?: string[];
  sourceNotes?: string;
  sourceUrls?: string[];
};

export async function updateProjectInsight(params: {
  projectId: string;
  category: ProjectInsightCategoryValue;
  mode: "manual" | "rules" | "web";
  content?: InsightUpdateContent;
}) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
  });
  if (!project) {
    throw new ApiError("프로젝트를 찾을 수 없습니다.", 404);
  }

  if (params.mode === "web") {
    await writeActivityLog({
      eventType: "PROJECT_INSIGHT_UPDATE_FAILED",
      summary: `${projectInsightCategoryLabels[params.category]} 웹검색 업데이트 불가`,
      projectId: params.projectId,
      actorType: "USER",
      metadata: {
        category: params.category,
        mode: params.mode,
        provider: "web",
      },
    });
    throw new ApiError(
      "아직 외부 웹검색 Provider가 연결되지 않았습니다. rules 또는 manual 모드를 사용하세요.",
      501,
    );
  }

  let payload: InsightUpdateContent;

  if (params.mode === "manual") {
    if (!params.content) {
      throw new ApiError("manual 모드에는 content가 필요합니다.", 400);
    }
    payload = params.content;
  } else {
    const [existing, targetCount, pendingReviewCount, contactReadyCount, recentActivityCount, collectionJobCount, candidateCount] =
      await Promise.all([
        prisma.projectInsight.findUnique({
          where: {
            projectId_category: {
              projectId: params.projectId,
              category: params.category,
            },
          },
        }),
        prisma.projectCompany.count({ where: { projectId: params.projectId } }),
        prisma.projectCompany.count({
          where: { projectId: params.projectId, reviewStatus: "PENDING" },
        }),
        prisma.projectCompany.count({
          where: {
            projectId: params.projectId,
            reviewStatus: { in: ["CONTACT_READY", "APPROVED"] },
          },
        }),
        prisma.dailyActivity.count({ where: { projectId: params.projectId } }),
        prisma.targetCollectionJob.count({
          where: { projectId: params.projectId },
        }),
        prisma.discoveredCandidate.count({
          where: { projectId: params.projectId },
        }),
      ]);

    payload = buildRuleBasedInsight({
      category: params.category,
      project: {
        name: project.name,
        companyName: project.companyName,
        location: project.location,
        askingPrice: project.askingPrice,
        summary: project.summary,
        propertyType: project.propertyType,
        landArea: project.landArea,
      },
      existing: existing
        ? {
            category: params.category,
            title: existing.title,
            summary: existing.summary ?? "",
            keyIssues: asStringArray(existing.keyIssues),
            saleImpact: existing.saleImpact ?? "",
            opportunities: asStringArray(existing.opportunities),
            risks: asStringArray(existing.risks),
            sourceNotes: existing.sourceNotes ?? "",
            sourceUrls: asStringArray(existing.sourceUrls),
          }
        : null,
      targetCount,
      pendingReviewCount,
      contactReadyCount,
      recentActivityCount,
      collectionJobCount,
      candidateCount,
    });
  }

  const now = new Date();
  const title = projectInsightCategoryLabels[params.category];

  const saved = await prisma.projectInsight.upsert({
    where: {
      projectId_category: {
        projectId: params.projectId,
        category: params.category,
      },
    },
    create: {
      projectId: params.projectId,
      category: params.category,
      title,
      summary: payload.summary ?? null,
      keyIssues: payload.keyIssues ?? [],
      saleImpact: payload.saleImpact ?? null,
      opportunities: payload.opportunities ?? [],
      risks: payload.risks ?? [],
      sourceNotes: payload.sourceNotes ?? null,
      sourceUrls: payload.sourceUrls ?? [],
      lastUpdatedAt: now,
    },
    update: {
      title,
      summary: payload.summary ?? null,
      keyIssues: payload.keyIssues ?? [],
      saleImpact: payload.saleImpact ?? null,
      opportunities: payload.opportunities ?? [],
      risks: payload.risks ?? [],
      sourceNotes: payload.sourceNotes ?? null,
      sourceUrls: payload.sourceUrls ?? [],
      lastUpdatedAt: now,
    },
  });

  await writeActivityLog({
    eventType: "PROJECT_INSIGHT_UPDATED",
    summary: `${title} 분석이 업데이트되었습니다.`,
    projectId: params.projectId,
    actorType: "USER",
    metadata: {
      category: params.category,
      mode: params.mode,
      provider: params.mode === "rules" ? "rules" : "manual",
      updatedFields: Object.keys(payload),
    },
  });

  return mapInsight(saved);
}

export async function updateAllProjectInsights(projectId: string) {
  const updatedCategories: ProjectInsightCategoryValue[] = [];

  for (const category of PROJECT_INSIGHT_CATEGORIES) {
    await updateProjectInsight({
      projectId,
      category,
      mode: "rules",
    });
    updatedCategories.push(category);
  }

  await writeActivityLog({
    eventType: "PROJECT_INSIGHT_ALL_UPDATED",
    summary: "진웅산업 분석 4개 섹션이 모두 업데이트되었습니다.",
    projectId,
    actorType: "USER",
    metadata: {
      categories: updatedCategories,
      mode: "rules",
      provider: "rules",
    },
  });

  return {
    updatedCategories,
    insights: await getProjectInsights(projectId),
  };
}
