import fs from "node:fs";

const transcriptPath =
  "C:/Users/elini/.cursor/projects/c-Users-elini-Desktop-Mynewcode-targetbridge-ai/agent-transcripts/70d0d27a-1d01-456e-b4f7-38b6dda7b513/70d0d27a-1d01-456e-b4f7-38b6dda7b513.jsonl";

const line = fs.readFileSync(transcriptPath, "utf8").split("\n")[40]!;
const parsed = JSON.parse(line) as {
  message: {
    content: { type: string; name?: string; input?: { contents: string } }[];
  };
};

const writeBlock = parsed.message.content.find(
  (x) => x.type === "tool_use" && x.name === "Write",
);
let contents = writeBlock?.input?.contents ?? "";

contents = contents.replace(
  /import "dotenv\/config";\nimport \{ PrismaBetterSqlite3 \}[\s\S]*?const prisma = new PrismaClient\(\{ adapter \}\);\n\n/,
  "",
);

contents = contents.replace(/\n    facilityScore: 88,\n/, "\n");

const header = `import "dotenv/config";
import { createPrismaClient } from "../lib/db/create-prisma-client";
import {
  CompanyStatus,
  ContactPermissionStatus,
  OutreachApprovalStatus,
  OutreachStatus,
  ProjectStatus,
  ReviewStatus,
  SuggestionStatus,
} from "../lib/constants/status";
import { normalizeCompanyName } from "../lib/format";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  console.error(
    "운영 환경 seed는 기본 차단됩니다. ALLOW_PRODUCTION_SEED=true 로 명시적으로 실행하세요.",
  );
  process.exit(1);
}

const prisma = createPrismaClient();

`;

const bodyStart = contents.indexOf("type DemoTarget");
fs.writeFileSync("prisma/seed.ts", header + contents.slice(bodyStart));

console.log("seed.ts restored");
