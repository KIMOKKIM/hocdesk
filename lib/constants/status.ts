export const ProjectStatus = {
  ACTIVE: "ACTIVE",
  HOLD: "HOLD",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProjectStatusValue =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const CompanyStatus = {
  NEW: "NEW",
  VALIDATED: "VALIDATED",
  SCORED: "SCORED",
  REVIEWED: "REVIEWED",
  CONTACT_READY: "CONTACT_READY",
  OUTREACH_STARTED: "OUTREACH_STARTED",
  EXCLUDED: "EXCLUDED",
} as const;

export type CompanyStatusValue =
  (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const ReviewStatus = {
  PENDING: "PENDING",
  REVIEWED: "REVIEWED",
  CONTACT_READY: "CONTACT_READY",
  OUTREACH_STARTED: "OUTREACH_STARTED",
  REJECTED: "REJECTED",
  HOLD: "HOLD",
  EXCLUDED: "EXCLUDED",
  /** @deprecated CONTACT_READY와 동일 취급 (기존 seed 호환) */
  APPROVED: "APPROVED",
} as const;

export type ReviewStatusValue = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const SuggestionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
} as const;

export const CollectionJobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  DRY_RUN: "DRY_RUN",
} as const;

export const DiscoveredCandidateStatus = {
  DISCOVERED: "DISCOVERED",
  ACCEPTED: "ACCEPTED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REJECTED: "REJECTED",
  IMPORTED: "IMPORTED",
  DUPLICATE: "DUPLICATE",
} as const;

export const OutreachApprovalStatus = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const OutreachStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENT: "SENT",
  REPLIED: "REPLIED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export const ContactPermissionStatus = {
  UNKNOWN: "UNKNOWN",
  PENDING: "PENDING",
  GRANTED: "GRANTED",
  DENIED: "DENIED",
} as const;
