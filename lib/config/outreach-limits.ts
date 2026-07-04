export const OUTREACH_LIMITS = {
  hardBlockDays: 7,
  warningDays: 30,
  maxImmediateSendBatch: 20,
  maxScheduledProcessBatch: 20,
} as const;

export type OutreachLimits = typeof OUTREACH_LIMITS;
