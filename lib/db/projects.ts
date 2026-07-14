import { prisma } from "@/lib/prisma";
import { formatDate, formatKoreanWon } from "@/lib/format";
import { projectStatusLabels } from "@/lib/constants/labels";
import { ProjectStatus } from "@/lib/constants/status";
import { isDatabaseSetupError } from "@/lib/db/errors";

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

function mapProjectDetail<T extends {
  status: string;
  askingPrice: bigint | null;
  updatedAt: Date;
  createdAt: Date;
  desiredClosingDate: Date | null;
}>(project: T) {
  return {
    ...project,
    statusLabel: projectStatusLabels[project.status] ?? project.status,
    askingPriceLabel: formatKoreanWon(project.askingPrice),
    updatedAtLabel: formatDate(project.updatedAt),
    createdAtLabel: formatDate(project.createdAt),
    desiredClosingDateLabel: formatDate(project.desiredClosingDate),
  };
}

/**
 * Project.id로 조회.
 * (운영 seed id = seed_jinwoong_yangju_sale — slug 필드 없음)
 * 관계 테이블이 없으면 기본 정보만 반환한다.
 */
export async function getProjectByIdOrSlug(param: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: param },
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
    return mapProjectDetail(project);
  } catch (error) {
    if (!isDatabaseSetupError(error)) throw error;

    // 관계 테이블 미준비 시 기본 Project만 조회
    try {
      const basic = await prisma.project.findUnique({ where: { id: param } });
      if (!basic) return null;
      return mapProjectDetail({
        ...basic,
        _count: {
          projectCompanies: 0,
          outreachs: 0,
          dailyActivities: 0,
        },
        projectCompanies: [],
      });
    } catch (inner) {
      if (isDatabaseSetupError(inner)) return null;
      throw inner;
    }
  }
}

/** @deprecated use getProjectByIdOrSlug */
export async function getProjectById(id: string) {
  return getProjectByIdOrSlug(id);
}
