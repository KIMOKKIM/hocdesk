import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { runTursoFullSetup } from "@/lib/turso/check-readiness";
import { TursoSetupError } from "@/lib/turso/setup-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const result = await runTursoFullSetup();
    return jsonOk({
      success: true,
      schemaApplied: result.schemaApplied,
      seedApplied: result.seedApplied,
      schemaReady: result.schemaReady,
      seedReady: result.seedReady,
      counts: result.counts,
    });
  } catch (error) {
    if (error instanceof TursoSetupError) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          errorCode: error.errorCode,
          message: error.message,
          error: error.message,
        },
        { status: error.errorCode === "TURSO_ENV_MISSING" ? 503 : 500 },
      );
    }
    return jsonError(error);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      errorCode: "METHOD_NOT_ALLOWED",
      message: "POST만 허용됩니다.",
      error: "POST만 허용됩니다.",
    },
    { status: 405 },
  );
}
