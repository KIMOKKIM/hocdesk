import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/Jinwoong",
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-libsql",
  ],
};

export default nextConfig;
