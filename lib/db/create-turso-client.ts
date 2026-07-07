import { PrismaClient } from "@/app/generated/prisma/client";
import { isNextBuildPhase } from "@/lib/db/database-provider";

const globalForTurso = globalThis as unknown as {
  tursoAdapter?: import("@prisma/adapter-libsql").PrismaLibSql;
  tursoPrisma?: PrismaClient;
};

function resolveTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url) {
    throw new Error("TURSO_DATABASE_URL이 설정되지 않았습니다.");
  }
  if (!authToken) {
    throw new Error("TURSO_AUTH_TOKEN이 설정되지 않았습니다.");
  }

  return { url, authToken };
}

export function createTursoPrismaClient(): PrismaClient {
  if (globalForTurso.tursoPrisma) {
    return globalForTurso.tursoPrisma;
  }

  if (isNextBuildPhase()) {
    throw new Error("Turso Prisma client cannot be created during Next.js build.");
  }

  const config = resolveTursoConfig();
  /* eslint-disable @typescript-eslint/no-require-imports -- avoid loading libsql adapter unless turso provider is active */
  const { PrismaLibSql } =
    require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (!globalForTurso.tursoAdapter) {
    globalForTurso.tursoAdapter = new PrismaLibSql(config);
  }

  const client = new PrismaClient({ adapter: globalForTurso.tursoAdapter });
  globalForTurso.tursoPrisma = client;
  return client;
}
