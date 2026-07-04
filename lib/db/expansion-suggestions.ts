import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { CollectionJobType } from "@/lib/constants/collection";
import {
  CollectionJobStatus,
  SuggestionStatus,
} from "@/lib/constants/status";
import {
  collectionRecommendationLabel,
  type CollectionRecommendation,
} from "@/lib/constants/activity";
import type { ActivityAnalysisResult } from "@/lib/analysis/types";
import { parseJsonArray } from "@/lib/utils/json";

export async function getExpansionSuggestionsByProject(projectId: string) {
  const suggestions = await prisma.targetExpansionSuggestion.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { recommendationScore: "desc" }],
    include: {
      dailyActivity: { select: { id: true, activityDate: true, summary: true } },
      collectionJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const enriched = await Promise.all(
    suggestions.map(async (item) => {
      const segmentCompanyCount = await prisma.projectCompany.count({
        where: {
          projectId,
          OR: [
            { company: { detailedIndustry: { contains: item.segmentName.slice(0, 4) } } },
            { company: { industryGroup: { contains: item.segmentName.slice(0, 2) } } },
          ],
        },
      });

      const recentJob = await prisma.targetCollectionJob.findFirst({
        where: {
          projectId,
          jobType: CollectionJobType.EXPANSION,
          status: CollectionJobStatus.COMPLETED,
          suggestion: { segmentName: item.segmentName },
        },
        orderBy: { completedAt: "desc" },
      });

      return {
        id: item.id,
        segmentName: item.segmentName,
        reason: item.reason,
        evidence: item.evidence,
        recommendationScore: item.recommendationScore,
        priority: item.priority,
        status: item.status,
        proposedRegions: item.proposedRegions,
        proposedKeywords: item.proposedKeywords,
        proposedTargetCount: item.proposedTargetCount,
        rejectedReason: item.rejectedReason,
        reviewedAt: item.reviewedAt ? formatDateTime(item.reviewedAt) : null,
        approvedAt: item.approvedAt ? formatDateTime(item.approvedAt) : null,
        createdAt: formatDateTime(item.createdAt),
        dailyActivityId: item.dailyActivityId,
        dailyActivitySummary: item.dailyActivity?.summary ?? null,
        latestJob: item.collectionJobs[0] ?? null,
        recommendationLabel: scoreLabel(item.recommendationScore),
        segmentCompanyCount,
        recentCollectionAt: recentJob?.completedAt
          ? formatDateTime(recentJob.completedAt)
          : null,
      };
    }),
  );

  return enriched;
}

export async function getAllExpansionSuggestions(limit = 5) {
  const suggestions = await prisma.targetExpansionSuggestion.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { project: { select: { name: true } } },
  });

  return suggestions.map((item) => ({
    id: item.id,
    segmentName: item.segmentName,
    recommendationScore: item.recommendationScore,
    status: item.status,
    projectName: item.project.name,
    createdAt: formatDateTime(item.createdAt),
  }));
}

export async function getExpansionSuggestionById(id: string) {
  return prisma.targetExpansionSuggestion.findUnique({
    where: { id },
    include: { collectionJobs: true, project: true },
  });
}

function scoreLabel(score: number) {
  if (score >= 70) return collectionRecommendationLabel("ACTIVE");
  if (score >= 50) return collectionRecommendationLabel("REVIEW");
  return collectionRecommendationLabel("HOLD");
}

export { parseJsonArray };

export function extractAnalysisSummary(analysis: unknown) {
  if (!analysis || typeof analysis !== "object") return null;
  const data = analysis as ActivityAnalysisResult;
  return {
    objections: data.objections ?? [],
    positiveSignals: data.positiveSignals ?? [],
    negativeSignals: data.negativeSignals ?? [],
    recommendedActions: data.recommendedActions ?? [],
    collectionRecommended: data.collectionRecommended as CollectionRecommendation,
    newTargetCount: data.newTargetSuggestions?.length ?? 0,
  };
}

export async function holdExpansionSuggestion(id: string) {
  return prisma.targetExpansionSuggestion.update({
    where: { id },
    data: {
      reviewedAt: new Date(),
      status: SuggestionStatus.PENDING,
    },
  });
}
