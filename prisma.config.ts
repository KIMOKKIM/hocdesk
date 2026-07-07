import "dotenv/config";
import { defineConfig } from "prisma/config";

const provider = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
const fallbackUrl = "file:./dev.db";
const datasourceUrl =
  provider === "turso"
    ? process.env.TURSO_DATABASE_URL ?? fallbackUrl
    : process.env.DATABASE_URL ?? fallbackUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
