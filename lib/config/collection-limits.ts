export const COLLECTION_LIMITS = {
  maxInitialCandidates: 60,
  maxPerSegment: 8,
  maxNewCompaniesPerDay: 30,
  maxPendingReview: 50,
  repeatSearchWaitDays: 14,
} as const;

export type CollectionLimits = typeof COLLECTION_LIMITS;
