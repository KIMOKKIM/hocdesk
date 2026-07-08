import { NextResponse } from "next/server";
import { APP_VERSION, BASE_PATH } from "@/lib/config";
import {
  getDatabaseProviderLabel,
  isProductionEnvironment,
  resolveDatabaseProvider,
} from "@/lib/db/database-provider";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let databaseProvider: string;
  try {
    databaseProvider = resolveDatabaseProvider();
  } catch {
    databaseProvider = "invalid";
  }

  if (isProductionEnvironment() && databaseProvider === "sqlite") {
    return NextResponse.json(
      {
        status: "error",
        database: "invalid-production-provider",
        databaseProvider: "sqlite",
        appVersion: APP_VERSION,
        basePath: BASE_PATH,
        environment: process.env.NODE_ENV ?? "production",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  let database: "connected" | "error" | "missing-credentials" = "connected";
  try {
    if (databaseProvider === "turso") {
      if (!process.env.TURSO_DATABASE_URL?.trim() || !process.env.TURSO_AUTH_TOKEN?.trim()) {
        database = "missing-credentials";
        throw new Error("Turso credentials are not configured");
      }
    }
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    if (database !== "missing-credentials") {
      database = "error";
    }
  }

  const status =
    database === "connected" ? "ok" : database === "missing-credentials" ? "error" : "degraded";

  return NextResponse.json(
    {
      status,
      database,
      databaseProvider: getDatabaseProviderLabel(),
      appVersion: APP_VERSION,
      basePath: BASE_PATH,
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      ...(database === "missing-credentials"
        ? {
            hint: "Vercel에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, DATABASE_PROVIDER=turso를 설정하세요.",
          }
        : {}),
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
