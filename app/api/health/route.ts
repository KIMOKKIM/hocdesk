import { NextResponse } from "next/server";
import { APP_VERSION, BASE_PATH } from "@/lib/config";
import { isProductionEnvironment } from "@/lib/db/database-provider";
import {
  assessDatabaseReadiness,
  resolveHealthStatus,
} from "@/lib/db/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await assessDatabaseReadiness();
  const status = resolveHealthStatus(readiness);

  if (isProductionEnvironment() && readiness.databaseProvider === "sqlite") {
    return NextResponse.json(
      {
        status: "error",
        database: "invalid-production-provider",
        databaseProvider: "sqlite",
        schemaReady: false,
        seedReady: false,
        checks: readiness.checks,
        appVersion: APP_VERSION,
        basePath: BASE_PATH,
        environment: process.env.NODE_ENV ?? "production",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const httpStatus =
    status === "ok" ? 200 : status === "setup_required" ? 503 : 503;

  return NextResponse.json(
    {
      status,
      database: readiness.database,
      databaseProvider: readiness.databaseProvider,
      schemaReady: readiness.schemaReady,
      seedReady: readiness.seedReady,
      ...(readiness.setupStep ? { setupStep: readiness.setupStep } : {}),
      checks: readiness.checks,
      appVersion: APP_VERSION,
      basePath: BASE_PATH,
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      ...(readiness.database === "missing-credentials"
        ? {
            hint: "Vercel에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, DATABASE_PROVIDER=turso를 설정하세요.",
          }
        : {}),
      ...(status === "setup_required" && readiness.setupStep === "schema"
        ? { hint: "npm run turso:schema:apply 실행 후 npm run turso:check로 확인하세요." }
        : {}),
      ...(status === "setup_required" && readiness.setupStep === "seed"
        ? { hint: "npm run turso:seed:apply 실행 후 npm run turso:check로 확인하세요." }
        : {}),
    },
    { status: httpStatus },
  );
}
