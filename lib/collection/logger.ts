import { COLLECTION_LIMITS } from "@/lib/config/collection-limits";
import type {
  CollectionAuditEvent,
  CollectionJobResult,
} from "@/lib/collection/types";

export function collectionLog(
  jobId: string,
  message: string,
  data?: Record<string, unknown>,
) {
  const payload = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`[collection:${jobId}] ${message}${payload}`);
}

export function collectionAudit(
  jobId: string,
  event: CollectionAuditEvent,
  data?: Record<string, unknown>,
) {
  const safeData = data ? sanitizeAuditData(data) : undefined;
  console.log(
    `[collection:${jobId}] AUDIT ${event}${safeData ? ` ${JSON.stringify(safeData)}` : ""}`,
  );
}

export function collectionError(
  jobId: string,
  message: string,
  error?: unknown,
) {
  console.error(`[collection:${jobId}] ERROR: ${message}`, error);
}

export function formatJobResultSummary(result: CollectionJobResult) {
  return `요청 ${result.requestedCount} / 처리 ${result.collectedCount} / 신규 ${result.acceptedCount} / 중복 ${result.duplicateCount} / 제외 ${result.rejectedCount}`;
}

function sanitizeAuditData(data: Record<string, unknown>) {
  const copy = { ...data };
  if (typeof copy.email === "string") {
    copy.email = maskEmail(copy.email);
  }
  if (typeof copy.generalEmail === "string") {
    copy.generalEmail = maskEmail(copy.generalEmail);
  }
  return copy;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "[REDACTED]";
  return `${local.slice(0, 2)}***@${domain}`;
}

export { COLLECTION_LIMITS };
