import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForTurso = globalThis as unknown as {
  tursoAdapter?: PrismaLibSql;
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

  const config = resolveTursoConfig();
  if (!globalForTurso.tursoAdapter) {
    globalForTurso.tursoAdapter = new PrismaLibSql(config);
  }

  const client = new PrismaClient({ adapter: globalForTurso.tursoAdapter });
  globalForTurso.tursoPrisma = client;
  return client;
}
