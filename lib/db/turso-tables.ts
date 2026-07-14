/** Prisma SQLite model names (= table names without @@map) */
export const TURSO_SCHEMA_TABLES = [
  { key: "projectTable", table: "Project" },
  { key: "companyTable", table: "Company" },
  { key: "projectCompanyTable", table: "ProjectCompany" },
  { key: "contactTable", table: "Contact" },
  { key: "companySourceTable", table: "CompanySource" },
  { key: "dailyActivityTable", table: "DailyActivity" },
  { key: "targetExpansionSuggestionTable", table: "TargetExpansionSuggestion" },
  { key: "targetCollectionJobTable", table: "TargetCollectionJob" },
  { key: "outreachTable", table: "Outreach" },
  { key: "appSettingTable", table: "AppSetting" },
  { key: "suppressionListTable", table: "SuppressionList" },
  { key: "activityLogTable", table: "ActivityLog" },
  { key: "searchCandidateTable", table: "DiscoveredCandidate" },
  { key: "projectInsightTable", table: "ProjectInsight" },
] as const;

export type TursoTableKey = (typeof TURSO_SCHEMA_TABLES)[number]["key"];

export type TursoTableCheckMap = Record<TursoTableKey, boolean>;
