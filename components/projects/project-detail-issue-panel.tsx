"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";
import { withBasePath } from "@/lib/paths";

export type ProjectDetailIssueCode =
  | "NOT_FOUND"
  | "SCHEMA_NOT_READY"
  | "SEED_NOT_READY"
  | "INSIGHT_TABLE_MISSING"
  | "COLLECTION_UNAVAILABLE"
  | "UNKNOWN";

type ProjectDetailIssuePanelProps = {
  code: ProjectDetailIssueCode;
  title?: string;
  message: string;
  showSetup?: boolean;
  databaseProvider?: string;
  isProduction?: boolean;
  hasTursoCredentials?: boolean;
};

const CODE_TITLE: Record<ProjectDetailIssueCode, string> = {
  NOT_FOUND: "프로젝트를 찾을 수 없습니다.",
  SCHEMA_NOT_READY: "운영 DB schema가 아직 준비되지 않았습니다.",
  SEED_NOT_READY: "진웅산업 기본 데이터가 아직 생성되지 않았습니다.",
  INSIGHT_TABLE_MISSING:
    "진웅산업 분석 테이블이 아직 생성되지 않았습니다. 운영 DB 초기화를 실행하세요.",
  COLLECTION_UNAVAILABLE: "타깃 수집 데이터를 불러올 수 없습니다.",
  UNKNOWN: "프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다.",
};

export function ProjectDetailIssuePanel({
  code,
  title,
  message,
  showSetup = false,
  databaseProvider = "turso",
  isProduction = true,
  hasTursoCredentials = true,
}: ProjectDetailIssuePanelProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function recheck() {
    setChecking(true);
    try {
      await fetch(withBasePath("/api/health"), { cache: "no-store" });
      router.refresh();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            {title ?? CODE_TITLE[code]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/dashboard" />}>대시보드로 이동</Button>
            <Button variant="outline" render={<Link href="/projects" />}>
              프로젝트 목록으로 이동
            </Button>
            <Button
              variant="outline"
              disabled={checking}
              onClick={() => void recheck()}
            >
              {checking ? "확인 중..." : "상태 다시 확인"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showSetup ? (
        <DbSetupAlert
          databaseProvider={databaseProvider}
          isProduction={isProduction}
          hasTursoCredentials={hasTursoCredentials}
        />
      ) : null}
    </div>
  );
}

type SectionNoticeProps = {
  title: string;
  message: string;
  showSetupHint?: boolean;
};

export function ProjectSectionNotice({
  title,
  message,
  showSetupHint = false,
}: SectionNoticeProps) {
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/10 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{message}</p>
        {showSetupHint ? (
          <p>
            대시보드의 운영 DB 초기화 또는{" "}
            <code className="rounded bg-muted px-1">npm run turso:setup</code>{" "}
            을 실행한 뒤 새로고침하세요.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
