import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DB_SETUP_COMMANDS,
  TURSO_SETUP_COMMANDS,
} from "@/lib/db/errors";
import { isProductionEnvironment } from "@/lib/db/database-provider";

export function DbSetupAlert() {
  const onVercel = isProductionEnvironment();
  const commands = onVercel ? TURSO_SETUP_COMMANDS : DB_SETUP_COMMANDS;

  return (
    <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          데이터베이스가 아직 준비되지 않았습니다
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {onVercel
            ? "Turso DB에 schema push와 seed가 필요합니다. 로컬에서 Turso 환경변수를 설정한 뒤 아래 명령을 실행하세요."
            : "SQLite 개발 DB를 생성한 뒤 다시 접속하세요. 아래 명령을 프로젝트 루트에서 순서대로 실행하세요."}
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-background p-4 font-mono text-xs leading-6">
          {commands.join("\n")}
        </pre>
        {!onVercel ? (
          <p className="text-xs text-muted-foreground">
            또는 한 번에 실행:{" "}
            <code className="rounded bg-muted px-1">npm run setup</code>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
