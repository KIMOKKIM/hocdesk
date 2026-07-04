#!/usr/bin/env npx tsx
/**
 * Kakao 실검색 품질 분석 (기본 dry-run, DB 미저장)
 * npx tsx scripts/test-kakao-live-quality.ts
 * npx tsx scripts/test-kakao-live-quality.ts --save
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import { validateIndustryFit } from "../lib/collection/industry-validation";
import {
  isKakaoApiConfigured,
  searchKakaoLocal,
} from "../lib/collection/providers/kakao-local-client";

const TEST_QUERIES = [
  { query: "양주 폐차장", segment: "폐차장" },
  { query: "양주 자동차해체재활용", segment: "자동차해체재활용업" },
  { query: "양주 대형차 정비", segment: "대형차 정비업" },
  { query: "포천 건설기계 정비", segment: "건설기계 정비업" },
  { query: "포천 고철", segment: "고철·비철 재활용업" },
  { query: "양주 자원순환", segment: "고철·비철 재활용업" },
  { query: "김포 중고차 수출", segment: "중고차 수출업" },
  { query: "인천 중고차 수출", segment: "중고차 수출업" },
  { query: "양주 물류창고", segment: "건축자재 물류업" },
  { query: "양주 공장 전문 부동산", segment: "공장·창고 전문 중개업" },
];

const save = process.argv.includes("--save");
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!isKakaoApiConfigured()) {
    console.log("SKIP: KAKAO_REST_API_KEY 없음 — live-quality 미검증");
    return;
  }

  console.log(`=== Kakao Live Quality (${save ? "SAVE" : "DRY-RUN"}) ===\n`);
  const seen = new Set<string>();

  for (const item of TEST_QUERIES) {
    const response = await searchKakaoLocal({ query: item.query, page: 1, size: 15 });
    let accept = 0;
    let review = 0;
    let reject = 0;
    let withPhone = 0;
    let withAddress = 0;
    let withUrl = 0;
    let dup = 0;
    let scoreSum = 0;
    const top: string[] = [];

    for (const place of response.documents) {
      if (seen.has(place.id)) {
        dup += 1;
        continue;
      }
      seen.add(place.id);

      const validation = validateIndustryFit({
        segmentName: item.segment,
        companyName: place.place_name,
        categoryName: place.category_name,
        categoryGroupName: place.category_group_name,
        searchKeyword: item.query,
        address: place.road_address_name || place.address_name,
      });

      if (validation.result === "ACCEPT") accept += 1;
      else if (validation.result === "REVIEW") review += 1;
      else reject += 1;

      scoreSum += validation.score;
      if (place.phone) withPhone += 1;
      if (place.road_address_name || place.address_name) withAddress += 1;
      if (place.place_url) withUrl += 1;
      if (top.length < 5) {
        top.push(`${place.place_name} (${place.category_name})`);
      }

      if (save && validation.result !== "REJECT" && !place.place_name.includes("데모")) {
        await prisma.discoveredCandidate.create({
          data: {
            projectId: (await prisma.project.findFirst())!.id,
            provider: "kakao",
            externalId: place.id,
            companyName: place.place_name,
            normalizedName: place.place_name.replace(/\s+/g, ""),
            segmentName: item.segment,
            categoryName: place.category_name,
            categoryGroupName: place.category_group_name,
            phone: place.phone || null,
            address: place.address_name || null,
            roadAddress: place.road_address_name || null,
            placeUrl: place.place_url || null,
            searchKeyword: item.query,
            sourceConfidence: validation.confidence,
            validationStatus:
              validation.result === "ACCEPT" ? "ACCEPTED" : "REVIEW_REQUIRED",
            validationScore: validation.score,
            rawMetadata: { scoreBreakdown: validation.scoreBreakdown },
          },
        });
      }
    }

    const avgScore =
      response.documents.length > 0
        ? Math.round(scoreSum / response.documents.length)
        : 0;

    console.log(`[${item.query}]`);
    console.log(
      `  raw=${response.documents.length} ACCEPT=${accept} REVIEW=${review} REJECT=${reject}`,
    );
    console.log(
      `  phone=${withPhone} address=${withAddress} url=${withUrl} dup=${dup} avgScore=${avgScore}`,
    );
    console.log(`  top: ${top.join(" | ") || "-"}\n`);
  }
}

main()
  .catch((error) => {
    console.error("\n실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
