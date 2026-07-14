"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";

export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            ProjectInsight 등 일부 테이블이 아직 없거나 조회 중 오류가 발생했을
            수 있습니다. 운영 DB 초기화 후 다시 열어주세요.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              ERROR {error.digest}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => reset()}>
              다시 시도
            </Button>
            <Button variant="outline" render={<Link href="/projects" />}>
              프로젝트 목록으로 이동
            </Button>
            <Button variant="outline" render={<Link href="/dashboard" />}>
              대시보드로 이동
            </Button>
          </div>
        </CardContent>
      </Card>
      <DbSetupAlert databaseProvider="turso" isProduction hasTursoCredentials />
    </div>
  );
}
