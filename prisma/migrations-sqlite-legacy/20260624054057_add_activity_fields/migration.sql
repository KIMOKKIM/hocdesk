-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "activityDate" DATETIME NOT NULL,
    "rawText" TEXT NOT NULL,
    "summary" TEXT,
    "activityType" TEXT NOT NULL DEFAULT 'OTHER',
    "result" TEXT,
    "contactedCompanyIds" JSONB,
    "aiAnalysis" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyActivity" ("activityDate", "aiAnalysis", "createdAt", "id", "projectId", "rawText", "summary") SELECT "activityDate", "aiAnalysis", "createdAt", "id", "projectId", "rawText", "summary" FROM "DailyActivity";
DROP TABLE "DailyActivity";
ALTER TABLE "new_DailyActivity" RENAME TO "DailyActivity";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
