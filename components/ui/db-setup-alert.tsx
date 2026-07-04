import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DB_SETUP_COMMANDS } from "@/lib/db/errors";

export function DbSetupAlert() {
  return (
    <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          데이터베이스가 아직 준비되지 않았습니다
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          SQLite 개발 DB를 생성한 뒤 다시 접속하세요. 아래 명령을 프로젝트
          루트에서 순서대로 실행하세요.
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-background p-4 font-mono text-xs leading-6">
          {DB_SETUP_COMMANDS.join("\n")}
        </pre>
        <p className="text-xs text-muted-foreground">
          또는 한 번에 실행: <code className="rounded bg-muted px-1">npm run setup</code>
        </p>
      </CardContent>
    </Card>
  );
}
