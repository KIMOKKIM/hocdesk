#!/usr/bin/env npx tsx
/**
 * Git 추적 파일 내 민감정보 패턴 검사
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "app/generated",
  "prisma/migrations-sqlite-legacy",
  "backup-before-vercel-jinwoong",
]);
const IGNORE_FILES = new Set(["package-lock.json", "dev.db", "dev.db-journal"]);
const PATTERNS = [
  /KAKAO_REST_API_KEY\s*=\s*["']?[a-zA-Z0-9_-]{20,}/,
  /Authorization:\s*KakaoAK\s+[a-zA-Z0-9_-]{10,}/,
  /OPENAI_API_KEY\s*=\s*["']?sk-[a-zA-Z0-9]{10,}/,
  /GMAIL.*TOKEN\s*=\s*["']?[a-zA-Z0-9._-]{20,}/i,
];

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (IGNORE_FILES.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx|json|md|env|example|sh|yml|yaml|css)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const violations: string[] = [];
  for (const file of walk(ROOT)) {
    const content = readFileSync(file, "utf8");
    for (const pattern of PATTERNS) {
      if (pattern.test(content)) {
        violations.push(`${relative(ROOT, file)} → ${pattern.source}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("민감정보 패턴 발견:");
    for (const item of violations) console.error(` - ${item}`);
    process.exit(1);
  }

  console.log("✓ check-secrets 통과");
}

main();
