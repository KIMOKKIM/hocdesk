import { prisma } from "@/lib/prisma";
import { formatDate, formatKoreanWon } from "@/lib/format";
import { projectStatusLabels } from "@/lib/constants/labels";
import { ProjectStatus } from "@/lib/constants/status";
import { isDatabaseSetupError } from "@/lib/db/errors";
import {
  demoCompanyExcludeWhere,
  filterOutDemoProjectCompanies,
  shouldIncludeDemo,
} from "@/lib/demo-filter";

export async function getProjects() {
  const includeDemo = shouldIncludeDemo();
  const companyFilter = includeDemo ? {} : demoCompanyExcludeWhere();

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          projectCompanies: {
            where: {
              reviewStatus: { not: "EXCLUDED" },
              ...(includeDemo ? {} : { company: companyFilter }),
            },
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

function mapProjectDetail<
  T extends {
    status: string;
    askingPrice: bigint | null;
    updatedAt: Date;
    createdAt: Date;
    desiredClosingDate: Date | null;
  },
>(project: T) {
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
 * 운영에서는 데모 ProjectCompany를 강제 제외한다.
 */
export async function getProjectByIdOrSlug(param: string) {
  const includeDemo = shouldIncludeDemo();
  const companyFilter = includeDemo ? {} : demoCompanyExcludeWhere();

  try {
    const project = await prisma.project.findUnique({
      where: { id: param },
      include: {
        _count: {
          select: {
            projectCompanies: {
              where: {
                reviewStatus: { not: { in: ["EXCLUDED", "REJECTED"] } },
                ...(includeDemo ? {} : { company: companyFilter }),
              },
            },
            outreachs: true,
            dailyActivities: true,
            discoveredCandidates: {
              where: {
                validationStatus: {
                  in: ["ACCEPTED", "REVIEW_REQUIRED", "DISCOVERED"],
                },
                isDuplicate: false,
              },
            },
          },
        },
        projectCompanies: {
          where: {
            reviewStatus: { not: { in: ["EXCLUDED", "REJECTED"] } },
            ...(includeDemo ? {} : { company: companyFilter }),
          },
          orderBy: { fitScore: "desc" },
          take: 20,
          include: { company: true },
        },
      },
    });

    if (!project) return null;

    const filteredCompanies = includeDemo
      ? project.projectCompanies
      : filterOutDemoProjectCompanies(project.projectCompanies).slice(0, 5);

    const pendingCandidates = project._count.discoveredCandidates ?? 0;
    const realTargetCount = includeDemo
      ? project._count.projectCompanies
      : Math.max(
          filteredCompanies.length,
          // Prisma 필터가 이미 적용된 카운트 (데모 제외)
          project._count.projectCompanies,
        );

    return mapProjectDetail({
      ...project,
      projectCompanies: filteredCompanies,
      _count: {
        ...project._count,
        projectCompanies:
          !includeDemo && filteredCompanies.length === 0
            ? 0
            : realTargetCount,
        pendingCandidates,
      },
    });
  } catch (error) {
    if (!isDatabaseSetupError(error)) {
      // discoveredCandidates count 미지원 등 → 단순 조회로 재시도
      try {
        const project = await prisma.project.findUnique({
          where: { id: param },
          include: {
            _count: {
              select: {
                projectCompanies: {
                  where: {
                    reviewStatus: { not: "EXCLUDED" },
                    ...(includeDemo ? {} : { company: companyFilter }),
                  },
                },
                outreachs: true,
                dailyActivities: true,
              },
            },
            projectCompanies: {
              where: {
                reviewStatus: { not: "EXCLUDED" },
                ...(includeDemo ? {} : { company: companyFilter }),
              },
              orderBy: { fitScore: "desc" },
              take: 20,
              include: { company: true },
            },
          },
        });
        if (!project) return null;
        const filteredCompanies = includeDemo
          ? project.projectCompanies
          : filterOutDemoProjectCompanies(project.projectCompanies).slice(0, 5);
        return mapProjectDetail({
          ...project,
          projectCompanies: filteredCompanies,
          _count: {
            ...project._count,
            pendingCandidates: 0,
          },
        });
      } catch (inner) {
        if (!isDatabaseSetupError(inner)) throw inner;
      }
    }

    try {
      const basic = await prisma.project.findUnique({ where: { id: param } });
      if (!basic) return null;
      return mapProjectDetail({
        ...basic,
        _count: {
          projectCompanies: 0,
          outreachs: 0,
          dailyActivities: 0,
          pendingCandidates: 0,
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
