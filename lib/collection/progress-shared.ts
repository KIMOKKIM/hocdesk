/**
 * 클라이언트·서버 공용 진행상태 상수/계산 (Prisma 없음)
 */
import { CollectionJobStatus } from "@/lib/constants/status";

export const CollectionProgressStep = {
  PREPARING: "준비 중",
  BUILDING_PLAN: "검색 계획 생성 중",
  SEARCH_READY: "Kakao API 호출 준비 완료",
  CALLING_API: "Kakao API 호출 중",
  NORMALIZING: "검색 결과 정규화 중",
  VALIDATING: "업종 적합성 검증 중",
  DEDUPING: "중복 검사 중",
  SAVING_CANDIDATES: "후보 저장 중",
  SAVING_COMPANIES: "업체 DB 등록 중",
  AGGREGATING: "작업 결과 집계 중",
  COMPLETED: "완료",
  FAILED: "실패",
  CANCELLED: "취소됨",
  RATE_LIMITED: "Kakao API 호출 제한으로 잠시 대기 중입니다.",
  RESPONSE_DELAYED: "검색어 처리 중 응답 지연이 발생했습니다.",
} as const;

export type CollectionProgressStepValue =
  (typeof CollectionProgressStep)[keyof typeof CollectionProgressStep];

/** 0~10 준비, 10~60 검색, 60~80 검증, 80~95 저장, 95~100 집계 */
export function calcSearchProgressPercent(
  processedQueries: number,
  totalQueries: number,
): number {
  if (totalQueries <= 0) return 10;
  const ratio = Math.min(1, Math.max(0, processedQueries / totalQueries));
  return 10 + Math.round(ratio * 50);
}

export function calcProcessProgressPercent(
  processed: number,
  total: number,
): number {
  if (total <= 0) return 80;
  const ratio = Math.min(1, Math.max(0, processed / total));
  return 80 + Math.round(ratio * 15);
}

export function stalledProgressWarning(
  lastProgressAt: Date | string | null | undefined,
  status: string,
): string | null {
  if (
    status !== CollectionJobStatus.RUNNING &&
    status !== CollectionJobStatus.QUEUED &&
    status !== CollectionJobStatus.CANCEL_REQUESTED
  ) {
    return null;
  }
  if (!lastProgressAt) return null;
  const at =
    typeof lastProgressAt === "string"
      ? new Date(lastProgressAt)
      : lastProgressAt;
  if (Number.isNaN(at.getTime())) return null;
  const elapsedMs = Date.now() - at.getTime();
  if (elapsedMs >= 180_000) {
    return "작업이 멈춘 것으로 보입니다. 새로고침 또는 재시도를 검토하세요.";
  }
  if (elapsedMs >= 60_000) {
    return "진행상태 갱신이 지연되고 있습니다.";
  }
  return null;
}

export function formatElapsed(startedAt: Date | string | null | undefined): string {
  if (!startedAt) return "-";
  const start =
    typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  if (Number.isNaN(start.getTime())) return "-";
  const sec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}
