"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DB_SETUP_COMMANDS } from "@/lib/db/errors";
import { withBasePath } from "@/lib/paths";

type SetupPhase =
  | "idle"
  | "confirm"
  | "connecting"
  | "schema"
  | "seed"
  | "checking"
  | "done"
  | "failed";

const PHASE_LABEL: Record<Exclude<SetupPhase, "idle" | "confirm">, string> = {
  connecting: "Turso 연결 확인 중",
  schema: "Schema 생성 중",
  seed: "Seed 생성 중",
  checking: "상태 확인 중",
  done: "완료",
  failed: "실패",
};

type DbSetupAlertProps = {
  databaseProvider?: string;
  isProduction?: boolean;
  hasTursoCredentials?: boolean;
};

export function DbSetupAlert({
  databaseProvider = "sqlite",
  isProduction = false,
  hasTursoCredentials = false,
}: DbSetupAlertProps) {
  const router = useRouter();
  const isTurso = databaseProvider === "turso";
  const [phase, setPhase] = useState<SetupPhase>("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successDetail, setSuccessDetail] = useState<string | null>(null);

  async function recheckHealth() {
    setPhase("checking");
    setErrorMessage(null);
    try {
      const res = await fetch(withBasePath("/api/health"), { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok" && data.schemaReady && data.seedReady) {
        setPhase("done");
        setSuccessDetail("운영 DB가 준비되었습니다. 페이지를 새로고침합니다.");
        router.refresh();
        return;
      }
      setPhase("idle");
      setErrorMessage(
        data.hint ??
          data.setupStep ??
          "아직 schema 또는 seed가 준비되지 않았습니다.",
      );
    } catch {
      setPhase("failed");
      setErrorMessage("상태 확인에 실패했습니다. 잠시 후 다시 시도하세요.");
    }
  }

  async function runSetup() {
    if (!confirmed) return;
    setErrorMessage(null);
    setSuccessDetail(null);
    setPhase("connecting");

    try {
      setPhase("schema");
      const res = await fetch(withBasePath("/api/admin/turso/setup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setPhase("seed");
      const data = await res.json();
      setPhase("checking");

      if (!res.ok || data.success === false || data.ok === false) {
        throw new Error(
          data.message ?? data.error ?? "운영 DB 초기화에 실패했습니다.",
        );
      }

      await fetch(withBasePath("/api/health"), { cache: "no-store" });
      setPhase("done");
      setSuccessDetail(
        `초기화 완료 — 프로젝트 ${data.counts?.projects ?? 0}개, 설정 ${data.counts?.appSettings ?? 0}개`,
      );
      setConfirmed(false);
      router.refresh();
    } catch (err) {
      setPhase("failed");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "운영 DB 초기화에 실패했습니다. Vercel Logs를 확인하세요.",
      );
    }
  }

  function openConfirm() {
    if (isProduction) {
      setPhase("confirm");
      setConfirmed(false);
      return;
    }
    setPhase("confirm");
    setConfirmed(false);
  }

  if (!isTurso) {
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

  const busy =
    phase === "connecting" ||
    phase === "schema" ||
    phase === "seed" ||
    phase === "checking";

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
          않았습니다. 관리자 로그인 상태에서 아래에서 초기화를 실행할 수
          있습니다.
        </p>

        {!hasTursoCredentials ? (
          <p className="rounded-lg border border-destructive/30 bg-background p-3 text-destructive">
            TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!hasTursoCredentials || busy || phase === "confirm"}
            onClick={openConfirm}
          >
            운영 DB 초기화 실행
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void recheckHealth()}
          >
            초기화 상태 다시 확인
          </Button>
        </div>

        {phase !== "idle" && phase !== "confirm" ? (
          <p className="text-sm font-medium">
            진행 상태: {PHASE_LABEL[phase as Exclude<SetupPhase, "idle" | "confirm">]}
          </p>
        ) : null}

        {successDetail ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-800 dark:text-emerald-200">
            {successDetail}
          </p>
        ) : null}

        {errorMessage ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-background p-3">
            <p className="text-destructive">{errorMessage}</p>
            {phase === "failed" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  자세한 내용은 Vercel Logs에서 확인하세요. 비밀값·SQL은 로그에
                  남기지 않습니다.
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={!hasTursoCredentials}
                  onClick={openConfirm}
                >
                  재시도
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {phase === "confirm" ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="turso-setup-title"
              className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg"
            >
              <h2 id="turso-setup-title" className="text-lg font-semibold">
                운영 DB 초기화를 실행하시겠습니까?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Turso DB에 필요한 테이블을 생성하고 진웅산업 기본 프로젝트와
                운영 설정만 생성합니다. 데모 업체는 생성하지 않습니다. 기존
                데이터는 삭제하지 않으며, 반복 실행해도 중복 생성되지 않도록
                처리합니다.
              </p>
              {isProduction ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  현재 운영(production) 환경입니다. 실행 전 대상 DB가 맞는지
                  다시 확인하세요.
                </p>
              ) : null}
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  기존 데이터를 삭제하지 않고 schema/seed만 적용하는 것을
                  확인했습니다.
                </span>
              </label>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPhase("idle");
                    setConfirmed(false);
                  }}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  disabled={!confirmed || busy}
                  onClick={() => void runSetup()}
                >
                  초기화 실행
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            진웅산업 기본 프로젝트와 운영 설정만 생성합니다. 데모 업체는
            생성하지 않습니다.
          </li>
          <li>
            초기화 후 타깃 업체는 0개일 수 있습니다. 프로젝트 상세에서 카카오
            실제 업체 검색을 실행하세요.
          </li>
          <li>초기화는 관리자 세션이 있을 때만 실행됩니다.</li>
          <li>CLI 대안: npm run turso:setup</li>
        </ul>
      </CardContent>
    </Card>
  );
}
