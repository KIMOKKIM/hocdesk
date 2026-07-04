export const EXTERNAL_SEARCH_LIMITS = {
  maxQueriesPerJob: 20,
  maxPagesPerQuery: 2,
  pageSize: 15,
  maxRawResultsPerJob: 150,
  maxAcceptedCompaniesPerJob: 30,
  requestDelayMs: 250,
  timeoutMs: 8000,
} as const;

export type ExternalSearchLimits = typeof EXTERNAL_SEARCH_LIMITS;
