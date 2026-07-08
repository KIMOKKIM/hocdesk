"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            페이지를 불러오지 못했습니다
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            서버에서 오류가 발생했습니다. 데이터베이스 schema/seed가 아직
            적용되지 않았을 수 있습니다.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              ERROR {error.digest}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" onClick={() => reset()}>
              다시 시도
            </Button>
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<a href="/dashboard">대시보드</a>}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
