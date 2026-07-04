import { collectionAudit } from "@/lib/collection/logger";
import { prisma } from "@/lib/prisma";
import { extractDomain } from "@/lib/format";

export type VerifyTargetInput = {
  projectCompanyId: string;
  website?: string | null;
  generalEmail?: string | null;
  mainPhone?: string | null;
  verificationMemo?: string | null;
  verifiedFields?: string[];
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  detailedIndustry?: string | null;
  currentFacilityType?: string | null;
  expansionSignal?: string | null;
};

export async function verifyTargetInformation(input: VerifyTargetInput) {
  const target = await prisma.projectCompany.findUnique({
    where: { id: input.projectCompanyId },
    include: { company: { include: { contacts: true } } },
  });

  if (!target) {
    throw new Error("타깃을 찾을 수 없습니다.");
  }

  const companyUpdate: Record<string, unknown> = {
    lastVerifiedAt: new Date(),
  };

  if (input.website !== undefined) {
    companyUpdate.website = input.website || null;
    companyUpdate.websiteDomain = input.website
      ? extractDomain(input.website)
      : null;
  }
  if (input.generalEmail !== undefined) {
    companyUpdate.generalEmail = input.generalEmail || null;
  }
  if (input.mainPhone !== undefined) {
    companyUpdate.mainPhone = input.mainPhone || null;
  }
  if (input.verificationMemo !== undefined) {
    companyUpdate.verificationMemo = input.verificationMemo || null;
  }
  if (input.detailedIndustry !== undefined) {
    companyUpdate.detailedIndustry = input.detailedIndustry || null;
  }
  if (input.currentFacilityType !== undefined) {
    companyUpdate.currentFacilityType = input.currentFacilityType || null;
  }

  await prisma.company.update({
    where: { id: target.companyId },
    data: companyUpdate,
  });

  if (input.contactEmail || input.contactName) {
    const existing = target.company.contacts[0];
    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          contactName: input.contactName ?? existing.contactName,
          jobTitle: input.contactTitle ?? existing.jobTitle,
          email: input.contactEmail ?? existing.email,
          verified: Boolean(input.contactEmail),
          lastVerifiedAt: input.contactEmail ? new Date() : existing.lastVerifiedAt,
        },
      });
    } else if (input.contactEmail || input.contactName) {
      await prisma.contact.create({
        data: {
          companyId: target.companyId,
          contactName: input.contactName,
          jobTitle: input.contactTitle,
          email: input.contactEmail,
          verified: Boolean(input.contactEmail),
          lastVerifiedAt: input.contactEmail ? new Date() : null,
          source: "MANUAL_VERIFICATION",
        },
      });
    }
  }

  const latestSource = await prisma.companySource.findFirst({
    where: { companyId: target.companyId },
    orderBy: { collectedAt: "desc" },
  });

  if (latestSource && input.verifiedFields?.length) {
    await prisma.companySource.update({
      where: { id: latestSource.id },
      data: { lastVerifiedAt: new Date() },
    });
  }

  collectionAudit("target", "TARGET_INFORMATION_VERIFIED", {
    projectCompanyId: input.projectCompanyId,
    companyId: target.companyId,
    verifiedFields: input.verifiedFields ?? [],
  });

  return prisma.projectCompany.findUnique({
    where: { id: input.projectCompanyId },
    include: {
      company: { include: { contacts: true, sources: true } },
      project: true,
    },
  });
}
