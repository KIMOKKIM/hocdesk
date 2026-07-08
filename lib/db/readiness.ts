import type { PrismaClient } from "@/app/generated/prisma/client";
import {
  isProductionEnvironment,
  resolveDatabaseProvider,
} from "@/lib/db/database-provider";
import { isDatabaseSetupError } from "@/lib/db/errors";
import { OPERATIONAL_PROJECT_ID } from "@/lib/seed/operational-seed";
import {
  TURSO_SCHEMA_TABLES,
  type TursoTableCheckMap,
  type TursoTableKey,
} from "@/lib/db/turso-tables";

export type HealthReadinessChecks = {
  projectTable: boolean;
  companyTable: boolean;
  appSettingTable: boolean;
  jinwoongProject: boolean;
};

export type DatabaseReadinessResult = {
  database: "connected" | "error" | "missing-credentials";
  databaseProvider: string;
  schemaReady: boolean;
  seedReady: boolean;
  setupStep?: "env" | "schema" | "seed";
  checks: HealthReadinessChecks;
};

const CORE_SCHEMA_KEYS: TursoTableKey[] = [
  "projectTable",
  "companyTable",
  "appSettingTable",
];

export async function tableExists(
  client: PrismaClient,
  tableName: string,
): Promise<boolean> {
  try {
    const rows = await client.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${tableName}
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function checkTursoTables(
  client: PrismaClient,
): Promise<TursoTableCheckMap> {
  const entries = await Promise.all(
    TURSO_SCHEMA_TABLES.map(async ({ key, table }) => [
      key,
      await tableExists(client, table),
    ] as const),
  );
  return Object.fromEntries(entries) as TursoTableCheckMap;
}

export async function hasJinwoongProject(client: PrismaClient): Promise<boolean> {
  try {
    const count = await client.project.count({
      where: {
        OR: [
          { id: OPERATIONAL_PROJECT_ID },
          { name: { contains: "진웅산업" } },
        ],
      },
    });
    return count > 0;
  } catch (error) {
    if (isDatabaseSetupError(error)) return false;
    throw error;
  }
}

function toHealthChecks(tableChecks: TursoTableCheckMap): HealthReadinessChecks {
  return {
    projectTable: tableChecks.projectTable,
    companyTable: tableChecks.companyTable,
    appSettingTable: tableChecks.appSettingTable,
    jinwoongProject: false,
  };
}

function isSchemaReady(tableChecks: TursoTableCheckMap): boolean {
  return CORE_SCHEMA_KEYS.every((key) => tableChecks[key]);
}

export async function assessDatabaseReadiness(
  client: PrismaClient,
): Promise<DatabaseReadinessResult> {
  let databaseProvider: string;
  try {
    databaseProvider = resolveDatabaseProvider();
  } catch {
    databaseProvider = "invalid";
  }

  if (databaseProvider === "turso") {
    if (
      !process.env.TURSO_DATABASE_URL?.trim() ||
      !process.env.TURSO_AUTH_TOKEN?.trim()
    ) {
      return {
        database: "missing-credentials",
        databaseProvider,
        schemaReady: false,
        seedReady: false,
        setupStep: "env",
        checks: {
          projectTable: false,
          companyTable: false,
          appSettingTable: false,
          jinwoongProject: false,
        },
      };
    }
  }

  try {
    await client.$queryRaw`SELECT 1`;
  } catch {
    return {
      database: "error",
      databaseProvider,
      schemaReady: false,
      seedReady: false,
      checks: {
        projectTable: false,
        companyTable: false,
        appSettingTable: false,
        jinwoongProject: false,
      },
    };
  }

  const tableChecks = await checkTursoTables(client);
  const checks = toHealthChecks(tableChecks);
  checks.jinwoongProject = await hasJinwoongProject(client);

  const schemaReady = isSchemaReady(tableChecks);
  const seedReady = checks.jinwoongProject;

  let setupStep: DatabaseReadinessResult["setupStep"];
  if (!schemaReady) setupStep = "schema";
  else if (!seedReady) setupStep = "seed";

  return {
    database: "connected",
    databaseProvider,
    schemaReady,
    seedReady,
    setupStep,
    checks,
  };
}

export function resolveHealthStatus(
  readiness: DatabaseReadinessResult,
): "ok" | "setup_required" | "error" | "degraded" {
  if (readiness.database === "missing-credentials") return "error";
  if (readiness.database === "error") return "degraded";

  if (isProductionEnvironment() && readiness.databaseProvider === "sqlite") {
    return "error";
  }

  if (readiness.schemaReady && readiness.seedReady) return "ok";
  if (readiness.database === "connected") return "setup_required";

  return "degraded";
}
