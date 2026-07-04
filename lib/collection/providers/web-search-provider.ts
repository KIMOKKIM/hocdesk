import type {
  SearchCandidate,
  SearchPlan,
  TargetSearchProvider,
  ValidationResult,
} from "@/lib/collection/types";
import {
  normalizeCandidateBase,
  validateCandidateBase,
} from "@/lib/collection/providers/demo-search-provider";

/**
 * Placeholder for a future web search API integration.
 * Does not perform crawling — requires explicit API credentials and allowed endpoints.
 */
export class WebSearchProvider implements TargetSearchProvider {
  readonly name = "web";

  async searchCompanies(searchPlan: SearchPlan): Promise<SearchCandidate[]> {
    void searchPlan;
    throw new Error(
      "WebSearchProvider는 아직 구현되지 않았습니다. TARGET_SEARCH_PROVIDER=demo 를 사용하세요.",
    );
  }

  normalizeCompany(candidate: SearchCandidate): SearchCandidate {
    return normalizeCandidateBase(candidate);
  }

  validateCandidate(candidate: SearchCandidate): ValidationResult {
    return validateCandidateBase(candidate);
  }
}
