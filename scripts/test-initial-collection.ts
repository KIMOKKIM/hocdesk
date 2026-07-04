import "dotenv/config";
import { runInitialCollection } from "../lib/collection/collection-service";
import { createPrismaClient } from "../lib/db/create-prisma-client";

const prisma = createPrismaClient();

async function main() {
  const beforeCompanies = await prisma.company.count();

  const project = await prisma.project.findFirst({
    where: { name: { contains: "진웅산업" } },
  });

  if (!project) {
    throw new Error("진웅산업 프로젝트를 찾을 수 없습니다.");
  }

  const completedCount = await prisma.targetCollectionJob.count({
    where: { projectId: project.id, jobType: "INITIAL", status: "COMPLETED" },
  });

  const result = await runInitialCollection({
    projectId: project.id,
    confirmed: completedCount > 0,
    requestedCount: 30,
  });

  const afterCompanies = await prisma.company.count();

  console.log(JSON.stringify(result, null, 2));
  console.log("Companies:", beforeCompanies, "->", afterCompanies);

  try {
    await runInitialCollection({ projectId: project.id, requestedCount: 30 });
    console.log("ERROR: duplicate INITIAL should be blocked");
  } catch (error) {
    console.log("Re-run blocked:", (error as Error).message);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
