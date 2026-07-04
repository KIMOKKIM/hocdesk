import { DemoSearchProvider } from "@/lib/collection/providers/demo-search-provider";
import { KakaoLocalSearchProvider } from "@/lib/collection/providers/kakao-local-search-provider";
import type {
  SearchCandidate,
  SearchPlan,
  TargetSearchProvider,
  ValidationResult,
} from "@/lib/collection/types";
import { normalizeCompanyName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function dedupeKey(candidate: SearchCandidate): string {
  if (candidate.externalId && candidate.provider) {
    return `${candidate.provider}:${candidate.externalId}`;
  }
  if (candidate.sourceUrl) return `url:${candidate.sourceUrl}`;
  return `name:${normalizeCompanyName(candidate.companyName)}`;
}

export class CompositeSearchProvider implements TargetSearchProvider {
  readonly name = "composite";
  private readonly kakao = new KakaoLocalSearchProvider();
  private readonly demo =
    process.env.NODE_ENV === "development" ? new DemoSearchProvider() : null;

  setJobContext(jobId: string) {
    this.kakao.setJobContext(jobId);
  }

  getKakaoContext() {
    return this.kakao.getContext();
  }

  async searchCompanies(searchPlan: SearchPlan): Promise<SearchCandidate[]> {
    const merged = new Map<string, SearchCandidate>();

    const kakaoResults = await this.kakao.searchCompanies(searchPlan);
    for (const candidate of kakaoResults) {
      merged.set(dedupeKey(candidate), candidate);
    }

    const dbCandidates = await this.searchExistingDbCompanies(searchPlan);
    for (const candidate of dbCandidates) {
      const key = dedupeKey(candidate);
      if (!merged.has(key)) merged.set(key, candidate);
    }

    if (this.demo && searchPlan.maxTotal > merged.size) {
      const demoResults = await this.demo.searchCompanies({
        ...searchPlan,
        maxTotal: Math.min(5, searchPlan.maxTotal - merged.size),
      });
      for (const candidate of demoResults) {
        const key = dedupeKey(candidate);
        if (!merged.has(key)) merged.set(key, { ...candidate, isDemo: true });
      }
    }

    return Array.from(merged.values()).slice(0, searchPlan.maxTotal);
  }

  normalizeCompany(candidate: SearchCandidate): SearchCandidate {
    if (candidate.isDemo || candidate.sourceType === "DEMO_SEARCH") {
      return this.demo!.normalizeCompany(candidate);
    }
    return this.kakao.normalizeCompany(candidate);
  }

  validateCandidate(candidate: SearchCandidate): ValidationResult {
    if (candidate.isDemo || candidate.sourceType === "DEMO_SEARCH") {
      return this.demo!.validateCandidate(candidate);
    }
    return this.kakao.validateCandidate(candidate);
  }

  private async searchExistingDbCompanies(
    searchPlan: SearchPlan,
  ): Promise<SearchCandidate[]> {
    const keywords = searchPlan.keywords.slice(0, 5);
    if (keywords.length === 0) return [];

    const companies = await prisma.company.findMany({
      where: {
        OR: keywords.map((keyword) => ({
          OR: [
            { detailedIndustry: { contains: keyword } },
            { companyName: { contains: keyword } },
          ],
        })),
      },
      include: { sources: { orderBy: { collectedAt: "desc" }, take: 1 } },
      take: 10,
    });

    return companies.map((company) => ({
      companyName: company.companyName,
      industryGroup: company.industryGroup,
      detailedIndustry: company.detailedIndustry,
      region: company.region,
      address: company.address,
      mainPhone: company.mainPhone,
      website: company.website,
      generalEmail: company.generalEmail,
      sourceType: company.sources[0]?.sourceType ?? "DB_EXISTING",
      sourceUrl: company.sources[0]?.sourceUrl,
      searchKeyword: keywords[0] ?? "existing",
      discoveredReason: `기존 DB: ${company.detailedIndustry ?? company.companyName}`,
      provider: "db",
      isDemo: company.companyName.includes("데모"),
      externalId: company.sources[0]?.externalId,
    }));
  }
}
