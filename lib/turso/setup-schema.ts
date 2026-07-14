import { createClient } from "@libsql/client";
import { hasTursoEnv } from "@/lib/db/turso-env";
import { TURSO_SCHEMA_DDL_STATEMENTS } from "@/lib/turso/schema-ddl";

export type SetupSchemaResult = {
  applied: boolean;
  statementCount: number;
};

export class TursoSetupError extends Error {
  constructor(
    message: string,
    readonly errorCode: string,
  ) {
    super(message);
    this.name = "TursoSetupError";
  }
}

function requireTursoCredentials(): { url: string; authToken: string } {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new TursoSetupError(
      "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.",
      "TURSO_ENV_MISSING",
    );
  }
  return { url, authToken };
}

/**
 * Apply Turso schema idempotently (CREATE TABLE/INDEX IF NOT EXISTS).
 * Does not drop tables or delete existing rows.
 */
export async function applyTursoSchema(): Promise<SetupSchemaResult> {
  if (!hasTursoEnv()) {
    throw new TursoSetupError(
      "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.",
      "TURSO_ENV_MISSING",
    );
  }

  const { url, authToken } = requireTursoCredentials();
  const client = createClient({ url, authToken });

  try {
    for (const statement of TURSO_SCHEMA_DDL_STATEMENTS) {
      await client.execute(statement);
    }
    return {
      applied: true,
      statementCount: TURSO_SCHEMA_DDL_STATEMENTS.length,
    };
  } catch {
    throw new TursoSetupError(
      "운영 DB schema 생성 중 오류가 발생했습니다.",
      "TURSO_SCHEMA_FAILED",
    );
  } finally {
    client.close();
  }
}
