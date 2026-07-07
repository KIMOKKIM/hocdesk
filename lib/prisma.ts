import "server-only";
import type { PrismaClient } from "@/app/generated/prisma/client";
import {
  createPrismaClient,
  isPrismaClientAvailable,
} from "@/lib/db/create-prisma-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

function unavailablePrismaProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      throw new Error(
        `Prisma client is not available during Next.js build (property: ${String(prop)}).`,
      );
    },
  });
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!isPrismaClientAvailable()) {
      return Reflect.get(unavailablePrismaProxy(), prop, receiver);
    }

    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
