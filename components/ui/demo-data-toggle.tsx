"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type DemoDataToggleProps = {
  includeDemo: boolean;
};

export function DemoDataToggle({ includeDemo }: DemoDataToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setIncludeDemo(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("includeDemo", "true");
    } else {
      params.set("includeDemo", "false");
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">데이터:</span>
      <button
        type="button"
        disabled={isPending}
        className={`rounded px-2 py-1 ${!includeDemo ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        onClick={() => setIncludeDemo(false)}
      >
        실제 업체만
      </button>
      <button
        type="button"
        disabled={isPending}
        className={`rounded px-2 py-1 ${includeDemo ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        onClick={() => setIncludeDemo(true)}
      >
        데모 포함
      </button>
    </div>
  );
}
