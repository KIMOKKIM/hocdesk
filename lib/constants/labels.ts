import {
  CompanyStatus,
  OutreachApprovalStatus,
  OutreachStatus,
  ProjectStatus,
  ReviewStatus,
} from "@/lib/constants/status";

export const projectStatusLabels: Record<string, string> = {
  [ProjectStatus.ACTIVE]: "진행중",
  [ProjectStatus.HOLD]: "보류",
  [ProjectStatus.COMPLETED]: "완료",
  [ProjectStatus.ARCHIVED]: "보관",
};

export const companyStatusLabels: Record<string, string> = {
  [CompanyStatus.NEW]: "신규",
  [CompanyStatus.VALIDATED]: "검증완료",
  [CompanyStatus.SCORED]: "점수산정",
  [CompanyStatus.REVIEWED]: "검토완료",
  [CompanyStatus.CONTACT_READY]: "접촉가능",
  [CompanyStatus.OUTREACH_STARTED]: "아웃리치진행",
  [CompanyStatus.EXCLUDED]: "제외",
};

export const reviewStatusLabels: Record<string, string> = {
  [ReviewStatus.PENDING]: "검토 대기",
  [ReviewStatus.REVIEWED]: "검토 완료",
  [ReviewStatus.CONTACT_READY]: "연락 준비 완료",
  [ReviewStatus.OUTREACH_STARTED]: "아웃리치 진행",
  [ReviewStatus.REJECTED]: "반려",
  [ReviewStatus.HOLD]: "보류",
  [ReviewStatus.EXCLUDED]: "제외",
  [ReviewStatus.APPROVED]: "연락 준비 완료",
};

export const suggestionStatusLabels: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절",
  COMPLETED: "수집 완료",
};

export const outreachStatusLabels: Record<string, string> = {
  [OutreachStatus.DRAFT]: "초안",
  [OutreachStatus.SCHEDULED]: "예약",
  [OutreachStatus.SENT]: "발송 완료",
  [OutreachStatus.REPLIED]: "회신",
  [OutreachStatus.FAILED]: "실패",
  [OutreachStatus.CANCELLED]: "취소",
};

export const outreachApprovalLabels: Record<string, string> = {
  [OutreachApprovalStatus.DRAFT]: "초안",
  [OutreachApprovalStatus.PENDING]: "승인 대기",
  [OutreachApprovalStatus.APPROVED]: "승인됨",
  [OutreachApprovalStatus.REJECTED]: "반려",
};
