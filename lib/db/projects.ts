import { prisma } from "@/lib/prisma";
import { formatDate, formatKoreanWon } from "@/lib/format";
import { projectStatusLabels } from "@/lib/constants/labels";
import { ProjectStatus } from "@/lib/constants/status";

export async function getProjects() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          projectCompanies: {
            where: { reviewStatus: { not: "EXCLUDED" } },
          },
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    companyName: project.companyName,
    projectType: project.projectType,
    status: project.status,
    statusLabel: projectStatusLabels[project.status] ?? project.status,
    location: project.location,
    askingPrice: project.askingPrice,
    askingPriceLabel: formatKoreanWon(project.askingPrice),
    targetCount: project._count.projectCompanies,
    updatedAt: formatDate(project.updatedAt),
  }));
}

export async function getProjectOptions() {
  const projects = await prisma.project.findMany({
    where: {
      status: ProjectStatus.ACTIVE,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          projectCompanies: true,
          outreachs: true,
          dailyActivities: true,
        },
      },
      projectCompanies: {
        where: { reviewStatus: { not: "EXCLUDED" } },
        orderBy: { fitScore: "desc" },
        take: 5,
        include: { company: true },
      },
    },
  });

  if (!project) return null;

  return {
    ...project,
    statusLabel: projectStatusLabels[project.status] ?? project.status,
    askingPriceLabel: formatKoreanWon(project.askingPrice),
    updatedAtLabel: formatDate(project.updatedAt),
    createdAtLabel: formatDate(project.createdAt),
    desiredClosingDateLabel: formatDate(project.desiredClosingDate),
  };
}
