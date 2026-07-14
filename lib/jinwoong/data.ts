import "server-only";
import { prisma } from "@/lib/prisma";
import {
  effectiveGrade,
  effectiveScore,
  JINWOONG_PROJECT_ID,
} from "@/lib/jinwoong/constants";
import { seedJinwoongMvp } from "@/lib/jinwoong/seed";

async function ensureSeeded() {
  const existing = await prisma.jinwoongProject.findUnique({
    where: { id: JINWOONG_PROJECT_ID },
    select: { id: true },
  });
  if (!existing) {
    await seedJinwoongMvp(prisma);
  }
}

export async function getJinwoongProject() {
  await ensureSeeded();
  return prisma.jinwoongProject.findUniqueOrThrow({
    where: { id: JINWOONG_PROJECT_ID },
    include: {
      companyProfile: true,
      _count: { select: { targets: true } },
    },
  });
}

export async function getJinwoongOverviewStats() {
  await ensureSeeded();
  const project = await prisma.jinwoongProject.findUniqueOrThrow({
    where: { id: JINWOONG_PROJECT_ID },
  });

  const [
    totalTargets,
    priorityCount,
    reviewingCount,
    proposalCount,
    newCount,
  ] = await Promise.all([
    prisma.jinwoongTarget.count({ where: { projectId: JINWOONG_PROJECT_ID } }),
    prisma.jinwoongTarget.count({
      where: {
        projectId: JINWOONG_PROJECT_ID,
        status: { in: ["PRIORITY_REVIEW", "CONTACT_READY"] },
      },
    }),
    prisma.jinwoongTarget.count({
      where: {
        projectId: JINWOONG_PROJECT_ID,
        status: { in: ["ANALYZING", "BASIC_RESEARCH", "PRIORITY_REVIEW"] },
      },
    }),
    prisma.jinwoongTarget.count({
      where: { projectId: JINWOONG_PROJECT_ID, hasProposal: true },
    }),
    prisma.jinwoongTarget.count({
      where: { projectId: JINWOONG_PROJECT_ID, status: "NEW" },
    }),
  ]);

  return {
    project,
    stats: {
      totalTargets,
      priorityCount,
      reviewingCount,
      proposalCount,
      newCount,
      lastUpdatedAt: project.lastUpdatedAt,
    },
  };
}

export type JinwoongTargetFilters = {
  stage?: number;
  country?: string;
  status?: string;
  q?: string;
  hasContact?: boolean;
  priorityOnly?: boolean;
  newOnly?: boolean;
};

export async function listJinwoongTargets(filters: JinwoongTargetFilters = {}) {
  await ensureSeeded();
  const where: Record<string, unknown> = { projectId: JINWOONG_PROJECT_ID };

  if (filters.stage) where.targetStage = filters.stage;
  if (filters.country) where.country = filters.country;
  if (filters.status) where.status = filters.status;
  if (filters.hasContact != null) where.hasContact = filters.hasContact;
  if (filters.newOnly) where.status = "NEW";
  if (filters.priorityOnly) {
    where.status = { in: ["PRIORITY_REVIEW", "CONTACT_READY"] };
  }
  if (filters.q) {
    where.OR = [
      { companyName: { contains: filters.q } },
      { companyNameEn: { contains: filters.q } },
      { industry: { contains: filters.q } },
    ];
  }

  const targets = await prisma.jinwoongTarget.findMany({
    where,
    orderBy: [{ priority: "asc" }, { aiScore: "desc" }, { companyName: "asc" }],
  });

  return targets.map((t) => ({
    ...t,
    displayScore: effectiveScore(t),
    displayGrade: effectiveGrade(t),
  }));
}

export async function getJinwoongTarget(id: string) {
  await ensureSeeded();
  const target = await prisma.jinwoongTarget.findFirst({
    where: { id, projectId: JINWOONG_PROJECT_ID },
    include: {
      analysis: true,
      contacts: { orderBy: { createdAt: "asc" } },
      proposals: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!target) return null;
  return {
    ...target,
    displayScore: effectiveScore(target),
    displayGrade: effectiveGrade(target),
  };
}

export async function getJinwoongCompanyProfile() {
  await ensureSeeded();
  const project = await prisma.jinwoongProject.findUniqueOrThrow({
    where: { id: JINWOONG_PROJECT_ID },
    include: { companyProfile: true },
  });
  return project;
}
