import { NextResponse } from "next/server";
import { ApiError, sanitizeErrorMessage } from "@/lib/api/errors";

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function jsonError(error: unknown, fallbackStatus = 400) {
  const status = error instanceof ApiError ? error.status : fallbackStatus;
  const message = sanitizeErrorMessage(error);

  return NextResponse.json(
    {
      ok: false,
      error: message,
      code: error instanceof ApiError ? error.code : undefined,
    },
    { status },
  );
}
