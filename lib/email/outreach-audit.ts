export type OutreachAuditEvent =
  | "OUTREACH_DRAFT_CREATED"
  | "OUTREACH_DRAFT_UPDATED"
  | "OUTREACH_APPROVAL_REQUESTED"
  | "OUTREACH_APPROVED"
  | "OUTREACH_REJECTED"
  | "OUTREACH_SCHEDULED"
  | "OUTREACH_SEND_STARTED"
  | "OUTREACH_SENT"
  | "OUTREACH_SEND_FAILED"
  | "OUTREACH_REPLY_RECORDED"
  | "OUTREACH_UNSUBSCRIBED";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "[redacted]";
  return `${local.slice(0, 2)}***@${domain}`;
}

export function outreachAudit(
  event: OutreachAuditEvent,
  data: Record<string, unknown>,
) {
  const safe = { ...data };
  if (typeof safe.to === "string") safe.to = maskEmail(safe.to);
  if (typeof safe.from === "string") safe.from = maskEmail(safe.from);
  if (typeof safe.email === "string") safe.email = maskEmail(safe.email);
  delete safe.body;
  delete safe.emailBody;
  console.log(`[outreach] AUDIT ${event} ${JSON.stringify(safe)}`);
}
