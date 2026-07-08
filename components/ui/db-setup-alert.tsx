import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DB_SETUP_COMMANDS } from "@/lib/db/errors";
import { isProductionEnvironment } from "@/lib/db/database-provider";

const TURSO_SETUP_STEPS = [
  {
    title: "1. Turso 연결 확인",
    command: "npm run turso:test",
  },
  {
    title: "2. Schema 반영",
    command: "npm run turso:schema:apply",
  },
  {
    title: "3. 운영 최소 데이터 생성",
    command: "npm run turso:seed:apply",
  },
  {
    title: "4. 다시 확인",
    command: "npm run turso:check",
  },
] as const;

export function DbSetupAlert() {
  const onVercel = isProductionEnvironment();

  if (onVercel) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            운영 데이터베이스 초기화가 필요합니다
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Turso DB 연결은 설정되었지만 아직 schema 또는 seed가 준비되지
            않았습니다. 로컬 개발환경에서 Turso 환경변수를 설정한 뒤 아래
            명령을 실행하세요.
          </p>
          <div className="space-y-3">
            {TURSO_SETUP_STEPS.map((step) => (
              <div key={step.title}>
                <p className="mb-1 font-medium">{step.title}</p>
                <pre className="overflow-x-auto rounded-lg border bg-background p-3 font-mono text-xs">
                  {step.command}
                </pre>
              </div>
            ))}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>.env에 TURSO_DATABASE_URL과 TURSO_AUTH_TOKEN이 필요합니다.</li>
            <li>
              Vercel 환경변수와 로컬 .env의 Turso 값이 같은 DB를 가리켜야
              합니다.
            </li>
            <li>운영 seed는 데모 업체를 기본으로 넣지 않습니다.</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

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
          또는 한 번에 실행:{" "}
          <code className="rounded bg-muted px-1">npm run setup</code>
        </p>
      </CardContent>
    </Card>
  );
}
