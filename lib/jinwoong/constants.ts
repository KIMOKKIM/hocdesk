export const JINWOONG_PROJECT_ID = "jinwww_sale_project";

export const JINWOONG_NAV: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/jinwoong", label: "프로젝트 개요", exact: true },
  { href: "/jinwoong/company", label: "진웅산업 분석" },
  { href: "/jinwoong/realtime", label: "실시간 분석" },
  { href: "/jinwoong/search", label: "타깃 매수자 검색" },
  { href: "/jinwoong/targets", label: "타깃 업체 리스트" },
  { href: "/jinwoong/scoring", label: "AI 적합도 평가" },
  { href: "/jinwoong/proposals", label: "맞춤 제안" },
];

export const TARGET_STAGE_LABELS: Record<number, string> = {
  1: "1단계 · 동일 업종 국내 경쟁",
  2: "2단계 · 전후방 산업",
  3: "3단계 · 유사 기술·인접 산업",
  4: "4단계 · 대기업·중견 신사업",
  5: "5단계 · 사모펀드·투자회사",
  6: "6단계 · 해외 전략 투자자",
  7: "7단계 · 개인·경영자 인수",
};

export const TARGET_STATUS_LABELS: Record<string, string> = {
  NEW: "신규 발견",
  BASIC_RESEARCH: "기초 조사",
  ANALYZING: "분석 중",
  PRIORITY_REVIEW: "우선 검토",
  CONTACT_READY: "접촉 준비",
  CONTACTED: "접촉 완료",
  INTEREST_CONFIRMED: "관심 확인",
  NEGOTIATING: "협의 중",
  ON_HOLD: "보류",
  EXCLUDED: "제외",
};

export const ACQUISITION_PROBABILITY_LABELS: Record<string, string> = {
  VERY_HIGH: "매우 높음",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
  VERY_LOW: "매우 낮음",
};

export const PROGRESS_STEP_STATUSES = ["WAITING", "IN_PROGRESS", "DONE", "REVIEW"] as const;

export const PROGRESS_STEP_LABELS: Record<string, string> = {
  WAITING: "대기",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
  REVIEW: "추가 검토",
};

export const DEFAULT_PROGRESS_STEPS = [
  { key: "company", label: "기업 분석", status: "DONE" },
  { key: "industry", label: "산업 분석", status: "IN_PROGRESS" },
  { key: "buyer_search", label: "매수자 탐색", status: "IN_PROGRESS" },
  { key: "scoring", label: "적합도 평가", status: "IN_PROGRESS" },
  { key: "contacts", label: "담당자 조사", status: "WAITING" },
  { key: "proposals", label: "맞춤 제안", status: "WAITING" },
  { key: "negotiation", label: "접촉 및 협상", status: "WAITING" },
];

export function scoreToGrade(score: number): string {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function effectiveScore(target: {
  aiScore: number;
  manualScore?: number | null;
}): number {
  return target.manualScore ?? target.aiScore;
}

export function effectiveGrade(target: {
  aiScore: number;
  aiGrade: string;
  manualScore?: number | null;
}): string {
  if (target.manualScore != null) return scoreToGrade(target.manualScore);
  return target.aiGrade;
}
