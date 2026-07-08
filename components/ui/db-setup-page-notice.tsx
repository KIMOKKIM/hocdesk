import { isProductionEnvironment } from "@/lib/db/database-provider";

type DbSetupPageNoticeProps = {
  resource?: string;
};

export function DbSetupPageNotice({
  resource = "이 목록",
}: DbSetupPageNoticeProps) {
  return (
    <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
      {isProductionEnvironment()
        ? `운영 DB 초기화 후 ${resource}이(가) 표시됩니다. 상단 안내의 Turso 명령을 실행하세요.`
        : `데이터베이스 준비 후 ${resource}이(가) 표시됩니다. 상단 안내를 참고하세요.`}
    </p>
  );
}
