"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CompanyStatus,
  ReviewStatus,
} from "@/lib/constants/status";
import { normalizeCompanyName } from "@/lib/format";
import { getDefaultProjectId } from "@/lib/db/targets";

export async function createTarget(formData: FormData) {
  const projectId =
    (formData.get("projectId") as string) || (await getDefaultProjectId());
  const companyName = (formData.get("companyName") as string)?.trim();

  if (!projectId || !companyName) {
    throw new Error("프로젝트와 업체명은 필수입니다.");
  }

  const company = await prisma.company.create({
    data: {
      companyName,
      normalizedName: normalizeCompanyName(companyName),
      industryGroup: (formData.get("industryGroup") as string) || null,
      detailedIndustry: (formData.get("detailedIndustry") as string) || null,
      region: (formData.get("region") as string) || null,
      estimatedRevenue: (formData.get("estimatedRevenue") as string) || null,
      currentFacilityType:
        (formData.get("currentFacilityType") as string) || null,
      mainPhone: (formData.get("mainPhone") as string) || null,
      generalEmail: (formData.get("generalEmail") as string) || null,
      status: CompanyStatus.NEW,
    },
  });

  const projectCompany = await prisma.projectCompany.create({
    data: {
      projectId,
      companyId: company.id,
      targetGrade: (formData.get("targetGrade") as string) || "C",
      fitScore: Number(formData.get("fitScore") || 0),
      recommendedUse: (formData.get("recommendedUse") as string) || null,
      targetingReason: (formData.get("targetingReason") as string) || null,
      riskFactors: (formData.get("riskFactors") as string) || null,
      reviewStatus: ReviewStatus.PENDING,
    },
  });

  revalidatePath("/targets");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/targets/${projectCompany.id}`);
}

export async function updateTarget(projectCompanyId: string, formData: FormData) {
  const existing = await prisma.projectCompany.findUnique({
    where: { id: projectCompanyId },
    select: { companyId: true },
  });

  if (!existing) {
    throw new Error("타깃을 찾을 수 없습니다.");
  }

  const companyName = (formData.get("companyName") as string)?.trim();
  if (!companyName) {
    throw new Error("업체명은 필수입니다.");
  }

  await prisma.company.update({
    where: { id: existing.companyId },
    data: {
      companyName,
      normalizedName: normalizeCompanyName(companyName),
      industryGroup: (formData.get("industryGroup") as string) || null,
      detailedIndustry: (formData.get("detailedIndustry") as string) || null,
      region: (formData.get("region") as string) || null,
      estimatedRevenue: (formData.get("estimatedRevenue") as string) || null,
      currentFacilityType:
        (formData.get("currentFacilityType") as string) || null,
      mainPhone: (formData.get("mainPhone") as string) || null,
      generalEmail: (formData.get("generalEmail") as string) || null,
    },
  });

  await prisma.projectCompany.update({
    where: { id: projectCompanyId },
    data: {
      targetGrade: (formData.get("targetGrade") as string) || "C",
      fitScore: Number(formData.get("fitScore") || 0),
      recommendedUse: (formData.get("recommendedUse") as string) || null,
      targetingReason: (formData.get("targetingReason") as string) || null,
      riskFactors: (formData.get("riskFactors") as string) || null,
    },
  });

  revalidatePath("/targets");
  revalidatePath(`/targets/${projectCompanyId}`);
  revalidatePath("/dashboard");
  redirect(`/targets/${projectCompanyId}`);
}

export async function excludeTarget(projectCompanyId: string) {
  const existing = await prisma.projectCompany.findUnique({
    where: { id: projectCompanyId },
    select: { companyId: true },
  });

  if (!existing) {
    throw new Error("타깃을 찾을 수 없습니다.");
  }

  await prisma.$transaction([
    prisma.projectCompany.update({
      where: { id: projectCompanyId },
      data: { reviewStatus: ReviewStatus.EXCLUDED },
    }),
    prisma.company.update({
      where: { id: existing.companyId },
      data: { status: CompanyStatus.EXCLUDED },
    }),
  ]);

  revalidatePath("/targets");
  revalidatePath("/dashboard");
  revalidatePath(`/targets/${projectCompanyId}`);
  redirect("/targets");
}
