"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewStatusLabels } from "@/lib/constants/labels";
import { ReviewStatus } from "@/lib/constants/status";
import { isContactReadyStatus } from "@/lib/review/target-review-service";
import { withBasePath } from "@/lib/paths";

type TargetReviewPanelProps = {
  projectCompanyId: string;
  projectName: string;
  reviewStatus: string;
  fitScore: number;
  targetGrade: string;
  recommendedUse: string | null;
  targetingReason: string | null;
  riskFactors: string | null;
  hasContact: boolean;
  hasVerifiedEmail: boolean;
  lastContactAt: string | null;
  nextActionDate: string | null;
};

async function patchReviewStatus(id: string, status: string) {
  const response = await fetch(
    withBasePath(`/api/project-companies/${id}/review-status`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "상태 변경 실패");
  }
  return data;
}

export function TargetReviewPanel({
  projectCompanyId,
  projectName,
  reviewStatus,
  fitScore,
  targetGrade,
  recommendedUse,
  targetingReason,
  riskFactors,
  hasContact,
  hasVerifiedEmail,
  lastContactAt,
  nextActionDate,
}: TargetReviewPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(status: string) {
    setError(null);
    startTransition(async () => {
      try {
        await patchReviewStatus(projectCompanyId, status);
        router.refresh();
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "상태 변경 실패",
        );
      }
    });
  }

  const statusLabel =
    reviewStatusLabels[reviewStatus] ?? reviewStatus;
  const canGenerateEmail = isContactReadyStatus(reviewStatus);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>검토 및 연락 준비</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Info label="프로젝트" value={projectName} />
          <Info label="검토상태" value={statusLabel} />
          <Info label="적합도" value={`${fitScore}점 · ${targetGrade}등급`} />
          <Info label="연락처" value={hasContact ? "보유" : "없음"} />
          <Info
            label="이메일 검증"
            value={hasVerifiedEmail ? "확인됨" : "미확인"}
          />
          <Info label="최근 접촉" value={lastContactAt ?? "-"} />
          <Info label="다음 조치일" value={nextActionDate ?? "-"} />
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">추천 활용: </span>
            {recommendedUse ?? "-"}
          </p>
          <p>
            <span className="text-muted-foreground">선정사유: </span>
            {targetingReason ?? "-"}
          </p>
          <p>
            <span className="text-muted-foreground">위험요소: </span>
            {riskFactors ?? "-"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(ReviewStatus.REVIEWED)}
          >
            검토 완료
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(ReviewStatus.CONTACT_READY)}
          >
            연락 준비 완료
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(ReviewStatus.HOLD)}
          >
            보류
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => run(ReviewStatus.REJECTED)}
          >
            제외
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => run(ReviewStatus.PENDING)}
          >
            상태 되돌리기
          </Button>
          {canGenerateEmail ? (
            <Badge variant="secondary">이메일 초안 생성 가능</Badge>
          ) : (
            <Badge variant="outline">연락 준비 완료 후 이메일 생성</Badge>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!canGenerateEmail ? (
          <p className="text-xs text-muted-foreground">
            이메일 초안은 연락 준비 완료(CONTACT_READY) 상태에서만 생성할 수
            있습니다.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
