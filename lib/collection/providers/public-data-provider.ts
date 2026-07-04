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
 * Placeholder for government / public registry API integrations.
 */
export class PublicDataProvider implements TargetSearchProvider {
  readonly name = "public";

  async searchCompanies(searchPlan: SearchPlan): Promise<SearchCandidate[]> {
    void searchPlan;
    throw new Error(
      "PublicDataProvider는 아직 구현되지 않았습니다. TARGET_SEARCH_PROVIDER=demo 를 사용하세요.",
    );
  }

  normalizeCompany(candidate: SearchCandidate): SearchCandidate {
    return normalizeCandidateBase(candidate);
  }

  validateCandidate(candidate: SearchCandidate): ValidationResult {
    return validateCandidateBase(candidate);
  }
}
