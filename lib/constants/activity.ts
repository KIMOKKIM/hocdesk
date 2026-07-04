export const ActivityType = {
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  MEETING: "MEETING",
  SITE_VISIT: "SITE_VISIT",
  RESEARCH: "RESEARCH",
  OTHER: "OTHER",
} as const;

export type ActivityTypeValue =
  (typeof ActivityType)[keyof typeof ActivityType];

export const ActivityResult = {
  INTERESTED: "INTERESTED",
  FOLLOW_UP: "FOLLOW_UP",
  HOLD: "HOLD",
  REJECTED: "REJECTED",
  NO_RESPONSE: "NO_RESPONSE",
  INFORMATION: "INFORMATION",
} as const;

export type ActivityResultValue =
  (typeof ActivityResult)[keyof typeof ActivityResult];

export const activityTypeLabels: Record<string, string> = {
  [ActivityType.EMAIL]: "이메일",
  [ActivityType.PHONE]: "전화",
  [ActivityType.MEETING]: "미팅",
  [ActivityType.SITE_VISIT]: "현장 방문",
  [ActivityType.RESEARCH]: "리서치",
  [ActivityType.OTHER]: "기타",
};

export const activityResultLabels: Record<string, string> = {
  [ActivityResult.INTERESTED]: "관심",
  [ActivityResult.FOLLOW_UP]: "후속 필요",
  [ActivityResult.HOLD]: "보류",
  [ActivityResult.REJECTED]: "거절",
  [ActivityResult.NO_RESPONSE]: "무응답",
  [ActivityResult.INFORMATION]: "정보 수집",
};

export const EXPANSION_SCORE_WEIGHTS = {
  MARKET_CLUE: 25,
  DIRECT_REFERRAL: 20,
  ASSET_FIT: 20,
  DB_GAP: 15,
  BUYING_POWER: 10,
  REGIONAL_EXPANSION: 10,
} as const;

export type CollectionRecommendation = "ACTIVE" | "REVIEW" | "HOLD";

export function collectionRecommendationFromScore(
  score: number,
): CollectionRecommendation {
  if (score >= 70) return "ACTIVE";
  if (score >= 50) return "REVIEW";
  return "HOLD";
}

export function collectionRecommendationLabel(rec: CollectionRecommendation) {
  switch (rec) {
    case "ACTIVE":
      return "추가수집 적극 추천";
    case "REVIEW":
      return "관리자 검토 추천";
    default:
      return "추가수집 보류";
  }
}
