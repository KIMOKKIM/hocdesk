import {
  extractDomain,
  normalizeAddress,
  normalizeCompanyName,
  normalizePhone,
} from "@/lib/format";
import type {
  DuplicateCheckResult,
  SearchCandidate,
} from "@/lib/collection/types";
import { prisma } from "@/lib/prisma";

const NAME_SIMILARITY_THRESHOLD = 0.98;

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  const distance = matrix[a.length]![b.length]!;
  return 1 - distance / Math.max(a.length, b.length);
}

function companyNameSimilarity(a: string, b: string): number {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (na === nb) return 1;
  return levenshteinRatio(na, nb);
}

export async function findDuplicateCompany(
  candidate: SearchCandidate,
): Promise<DuplicateCheckResult> {
  const normalizedName = normalizeCompanyName(candidate.companyName);
  const normalizedAddr = candidate.address
    ? normalizeAddress(candidate.address)
    : null;
  const domain = candidate.websiteDomain
    ? extractDomain(candidate.websiteDomain)
    : candidate.website
      ? extractDomain(candidate.website)
      : null;
  const phone = candidate.mainPhone ? normalizePhone(candidate.mainPhone) : null;

  if (candidate.provider && candidate.externalId) {
    const match = await prisma.companySource.findFirst({
      where: {
        provider: candidate.provider,
        externalId: candidate.externalId,
      },
      select: { companyId: true },
    });
    if (match) {
      return {
        isDuplicate: true,
        existingCompanyId: match.companyId,
        reason: "providerExternalId",
      };
    }
  }

  if (candidate.placeUrl || candidate.sourceUrl) {
    const url = candidate.placeUrl ?? candidate.sourceUrl;
    const match = await prisma.companySource.findFirst({
      where: { sourceUrl: url },
      select: { companyId: true },
    });
    if (match) {
      return {
        isDuplicate: true,
        existingCompanyId: match.companyId,
        reason: "placeUrl",
      };
    }
  }

  if (candidate.businessNumber) {
    const match = await prisma.company.findUnique({
      where: { businessNumber: candidate.businessNumber },
      select: { id: true },
    });
    if (match) {
      return {
        isDuplicate: true,
        existingCompanyId: match.id,
        reason: "businessNumber",
      };
    }
  }

  if (candidate.corporateNumber) {
    const match = await prisma.company.findFirst({
      where: { corporateNumber: candidate.corporateNumber },
      select: { id: true },
    });
    if (match) {
      return {
        isDuplicate: true,
        existingCompanyId: match.id,
        reason: "corporateNumber",
      };
    }
  }

  if (domain) {
    const matches = await prisma.company.findMany({
      where: {
        OR: [{ websiteDomain: domain }, { website: { contains: domain } }],
      },
      select: { id: true },
      take: 1,
    });
    if (matches[0]) {
      return {
        isDuplicate: true,
        existingCompanyId: matches[0].id,
        reason: "websiteDomain",
      };
    }
  }

  if (phone) {
    const matches = await prisma.company.findMany({
      where: { mainPhone: { not: null } },
      select: { id: true, mainPhone: true },
    });
    const match = matches.find(
      (company) =>
        company.mainPhone && normalizePhone(company.mainPhone) === phone,
    );
    if (match) {
      return {
        isDuplicate: true,
        existingCompanyId: match.id,
        reason: "mainPhone",
      };
    }
  }

  if (normalizedAddr) {
    const matches = await prisma.company.findMany({
      where: {
        normalizedName,
        normalizedAddress: normalizedAddr,
      },
      select: { id: true },
      take: 1,
    });
    if (matches[0]) {
      return {
        isDuplicate: true,
        existingCompanyId: matches[0].id,
        reason: "nameAndAddress",
      };
    }
  }

  const allCompanies = await prisma.company.findMany({
    select: { id: true, companyName: true },
  });

  for (const company of allCompanies) {
    const similarity = companyNameSimilarity(
      candidate.companyName,
      company.companyName,
    );
    if (similarity >= NAME_SIMILARITY_THRESHOLD) {
      const link = await prisma.projectCompany.findFirst({
        where: { companyId: company.id },
        select: { fitScore: true },
        orderBy: { fitScore: "desc" },
      });
      return {
        isDuplicate: true,
        existingCompanyId: company.id,
        reason: "nameSimilarity",
        existingFitScore: link?.fitScore,
      };
    }
  }

  return { isDuplicate: false };
}

export async function sourceRecordExists(
  companyId: string,
  candidate: SearchCandidate,
): Promise<boolean> {
  if (candidate.sourceUrl && candidate.searchKeyword) {
    const existing = await prisma.companySource.findFirst({
      where: {
        companyId,
        sourceUrl: candidate.sourceUrl,
        searchKeyword: candidate.searchKeyword,
      },
    });
    if (existing) return true;
  }

  if (candidate.provider && candidate.externalId) {
    const existing = await prisma.companySource.findFirst({
      where: {
        companyId,
        provider: candidate.provider,
        externalId: candidate.externalId,
      },
    });
    if (existing) return true;
  }

  return false;
}

export async function findRecentSearchKeywordUsage(query: string) {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  return prisma.companySource.findFirst({
    where: {
      searchKeyword: query,
      collectedAt: { gte: since },
    },
    orderBy: { collectedAt: "desc" },
  });
}

export function buildSourceDiscoveredReason(jobId: string, reason: string) {
  return `job:${jobId}|${reason}`;
}

export function jobIdFromDiscoveredReason(discoveredReason: string) {
  const match = discoveredReason.match(/^job:([^|]+)\|/);
  return match?.[1] ?? null;
}
