"use client";

import { useTransition } from "react";
import { excludeTarget } from "@/app/(app)/targets/actions";
import { Button } from "@/components/ui/button";

export function ExcludeTargetButton({
  projectCompanyId,
}: {
  projectCompanyId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        if (
          confirm("이 타깃 업체를 제외 처리하시겠습니까? 목록에서 숨겨집니다.")
        ) {
          startTransition(async () => {
            await excludeTarget(projectCompanyId);
          });
        }
      }}
    >
      {isPending ? "처리 중..." : "타깃 제외"}
    </Button>
  );
}
