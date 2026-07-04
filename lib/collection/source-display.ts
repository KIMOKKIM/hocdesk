export function isDemoCompany(
  companyName: string,
  sourceType?: string | null,
  rawMetadata?: unknown,
): boolean {
  if (companyName.includes("데모")) return true;
  if (sourceType === "DEMO_SEARCH") return true;
  if (rawMetadata && typeof rawMetadata === "object") {
    const meta = rawMetadata as { isDemo?: boolean };
    if (meta.isDemo === true) return true;
  }
  return false;
}

export function sourceTypeLabel(sourceType?: string | null) {
  switch (sourceType) {
    case "DEMO_SEARCH":
      return "데모 검색";
    case "KAKAO_LOCAL":
      return "카카오 Local";
    case "COLLECTION_JOB":
      return "수집 작업";
    case "DB_EXISTING":
      return "기존 DB";
    default:
      return sourceType ?? "미확인";
  }
}

export function confidenceLabel(confidence?: string | null) {
  switch (confidence) {
    case "HIGH":
      return "높음";
    case "MEDIUM":
      return "보통";
    case "LOW":
      return "낮음";
    default:
      return "미확인";
  }
}
