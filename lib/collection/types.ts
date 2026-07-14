import type { InitialCollectionSegment } from "@/lib/constants/collection";

export type KakaoSearchQuery = {
  segment: string;
  region: string;
  query: string;
  priority: number;
  expectedUse: string;
};

export type SearchPlan = {
  projectId: string;
  jobId?: string;
  jobType: string;
  type: string;
  region: string;
  regions: string[];
  keywords: string[];
  requestedCount: number;
  maxTotal: number;
  maxPerSegment: number;
  segments: (InitialCollectionSegment & { maxCount?: number })[];
  provider?: string;
  dryRun?: boolean;
  importMode?: "review" | "fast";
  generatedQueries?: KakaoSearchQuery[];
  queryCount?: number;
  pagesRequested?: number;
  requestedRegions?: string[];
  requestedSegments?: string[];
};

export type CandidateMetadata = {
  externalId?: string | null;
  provider?: string | null;
  placeName?: string | null;
  categoryName?: string | null;
  categoryGroupName?: string | null;
  placeUrl?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  rawAddress?: string | null;
  roadAddress?: string | null;
  sourceConfidence?: string | null;
  isDemo?: boolean;
  industryValidation?: string | null;
  rawMetadata?: Record<string, unknown> | null;
};

export type CompanyCandidate = {
  companyName: string;
  businessNumber?: string | null;
  corporateNumber?: string | null;
  industryGroup?: string | null;
  detailedIndustry?: string | null;
  website?: string | null;
  websiteDomain?: string | null;
  address?: string | null;
  normalizedAddress?: string | null;
  region?: string | null;
  representativeName?: string | null;
  mainPhone?: string | null;
  generalEmail?: string | null;
  employeeCount?: number | null;
  estimatedRevenue?: string | null;
  currentFacilityType?: string | null;
  sourceType: string;
  sourceUrl?: string | null;
  searchKeyword: string;
  discoveredReason: string;
  fitScore?: number;
  financialScore?: number;
  locationScore?: number;
  facilityNeedScore?: number;
  expansionSignalScore?: number;
  decisionMakerScore?: number;
  targetGrade?: string;
  recommendedUse?: string | null;
  targetingReason?: string | null;
  riskFactors?: string | null;
} & CandidateMetadata;

export type SearchCandidate = CompanyCandidate;

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

export interface TargetSearchProvider {
  readonly name: string;
  searchCompanies(searchPlan: SearchPlan): Promise<SearchCandidate[]>;
  normalizeCompany(candidate: SearchCandidate): SearchCandidate;
  validateCandidate(candidate: SearchCandidate): ValidationResult;
}

export type DuplicateMatchReason =
  | "providerExternalId"
  | "placeUrl"
  | "businessNumber"
  | "corporateNumber"
  | "websiteDomain"
  | "mainPhone"
  | "nameAndAddress"
  | "nameSimilarity";

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  existingCompanyId?: string;
  reason?: DuplicateMatchReason;
  existingFitScore?: number;
};

export type CollectionJobStats = {
  provider: string;
  queryCount: number;
  apiCallCount: number;
  rawResultCount: number;
  industryAccepted: number;
  industryReview: number;
  industryRejected: number;
  duplicateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  withPhone: number;
  withoutWebsite: number;
  withoutEmail: number;
  segmentBreakdown: Array<{
    segment: string;
    queryCount: number;
    rawResults: number;
    accepted: number;
    duplicate: number;
    rejected: number;
  }>;
  dryRun?: boolean;
  importMode?: "review" | "fast";
  candidatesCreated?: number;
  companiesImported?: number;
};

export type CollectionJobResult = {
  jobId: string;
  status: string;
  requestedCount: number;
  collectedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  gradeCounts: { A: number; B: number; C: number; EXCLUDED: number };
  jobStats?: CollectionJobStats | null;
  errorMessage?: string | null;
};

export type CollectionAuditEvent =
  | "INITIAL_COLLECTION_REQUESTED"
  | "INITIAL_COLLECTION_STARTED"
  | "EXPANSION_COLLECTION_REQUESTED"
  | "EXPANSION_COLLECTION_STARTED"
  | "COMPANY_CREATED"
  | "EXPANSION_COMPANY_CREATED"
  | "COMPANY_DUPLICATE_FOUND"
  | "EXPANSION_DUPLICATE_FOUND"
  | "COMPANY_REJECTED"
  | "INITIAL_COLLECTION_COMPLETED"
  | "EXPANSION_COLLECTION_COMPLETED"
  | "INITIAL_COLLECTION_FAILED"
  | "EXPANSION_COLLECTION_FAILED"
  | "EXTERNAL_SEARCH_REQUESTED"
  | "EXTERNAL_SEARCH_STARTED"
  | "EXTERNAL_SEARCH_QUERY_COMPLETED"
  | "EXTERNAL_COMPANY_CREATED"
  | "EXTERNAL_COMPANY_DUPLICATE"
  | "EXTERNAL_COMPANY_REVIEW_REQUIRED"
  | "EXTERNAL_COMPANY_REJECTED"
  | "EXTERNAL_SEARCH_COMPLETED"
  | "EXTERNAL_SEARCH_FAILED"
  | "TARGET_INFORMATION_VERIFIED";

export type SearchProviderName = "demo" | "kakao" | "composite" | "web" | "public";
