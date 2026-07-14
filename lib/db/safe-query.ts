import { isDatabaseSetupError } from "@/lib/db/errors";

export type SafeQueryResult<T> = {
  data: T;
  ok: boolean;
  errorCode: string | null;
};

/**
 * 섹션 단위 조회 방어. 테이블 미준비 등으로 실패해도 페이지 전체를 죽이지 않는다.
 */
export async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<SafeQueryResult<T>> {
  try {
    const data = await fn();
    return { data, ok: true, errorCode: null };
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : isDatabaseSetupError(error)
          ? "DB_SETUP"
          : "UNKNOWN";

    console.error(`[project-detail] ${label} failed:`, code, error instanceof Error ? error.message : error);

    return {
      data: fallback,
      ok: false,
      errorCode: code,
    };
  }
}
