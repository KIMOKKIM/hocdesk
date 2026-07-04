import "dotenv/config";
import { defineConfig } from "prisma/config";

const provider = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
const datasourceUrl =
  provider === "turso"
    ? process.env.TURSO_DATABASE_URL
    : process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
