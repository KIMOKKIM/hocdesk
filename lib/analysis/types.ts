import type { CollectionRecommendation } from "@/lib/constants/activity";

export type NewTargetSuggestionItem = {
  segment: string;
  reason: string;
  evidence: string[];
  recommendationScore: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  regions: string[];
  keywords: string[];
  targetCount: number;
  scoreBreakdown?: Record<string, number>;
};

export type ActivityAnalysisResult = {
  dailySummary: string;
  positiveSignals: string[];
  negativeSignals: string[];
  objections: string[];
  newTargetSuggestions: NewTargetSuggestionItem[];
  recommendedActions: string[];
  collectionRecommended: CollectionRecommendation;
  expansionScore: number;
  analyzer: "ai" | "rules";
  analyzedAt: string;
  warnings?: string[];
  suggestionsCreated?: number;
};

export type AnalyzeActivityInput = {
  rawText: string;
  activityType: string;
  result?: string | null;
  projectId: string;
  projectLocation?: string | null;
  contactedCompanyNames?: string[];
};
