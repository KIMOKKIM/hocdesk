import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { seedJinwoongMvp } from "../lib/jinwoong/seed";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({ adapter });
  try {
    await seedJinwoongMvp(prisma);
    console.log("Jinwoong targets:", await prisma.jinwoongTarget.count());
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
