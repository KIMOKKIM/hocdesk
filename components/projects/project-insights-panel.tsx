"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  PROJECT_INSIGHT_CATEGORIES,
  projectInsightCategoryLabels,
  type ProjectInsightCategoryValue,
} from "@/lib/project-insights/constants";
import { withBasePath } from "@/lib/paths";
import { Loader2, Pencil, RefreshCw } from "lucide-react";

export type ProjectInsightView = {
  id?: string;
  category: string;
  title: string;
  summary: string | null;
  keyIssues: string[];
  saleImpact: string | null;
  opportunities: string[];
  risks: string[];
  sourceNotes: string | null;
  sourceUrls: string[];
  lastUpdatedAt: string | null;
};

type ProjectInsightsPanelProps = {
  projectId: string;
  initialInsights: ProjectInsightView[];
};

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

export function ProjectInsightsPanel({
  projectId,
  initialInsights,
}: ProjectInsightsPanelProps) {
  const [insights, setInsights] = useState(initialInsights);
  const [active, setActive] = useState<ProjectInsightCategoryValue>("POLITICS");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const current = useMemo(
    () =>
      insights.find((item) => item.category === active) ??
      ({
        category: active,
        title: projectInsightCategoryLabels[active],
        summary: null,
        keyIssues: [],
        saleImpact: null,
        opportunities: [],
        risks: [],
        sourceNotes: null,
        sourceUrls: [],
        lastUpdatedAt: null,
      } satisfies ProjectInsightView),
    [insights, active],
  );

  const [draft, setDraft] = useState({
    summary: "",
    keyIssues: "",
    saleImpact: "",
    opportunities: "",
    risks: "",
    sourceNotes: "",
  });

  function beginEdit() {
    setDraft({
      summary: current.summary ?? "",
      keyIssues: listToLines(current.keyIssues),
      saleImpact: current.saleImpact ?? "",
      opportunities: listToLines(current.opportunities),
      risks: listToLines(current.risks),
      sourceNotes: current.sourceNotes ?? "",
    });
    setEditing(true);
  }

  async function callUpdate(
    path: string,
    body: Record<string, unknown>,
    key: string,
  ) {
    setPendingKey(key);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(withBasePath(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "업데이트에 실패했습니다.");
      }
      if (data.insights) {
        setInsights(data.insights);
      } else if (data.insight) {
        setInsights((prev) => {
          const next = prev.filter(
            (item) => item.category !== data.insight.category,
          );
          return [...next, data.insight].sort((a, b) =>
            a.category.localeCompare(b.category),
          );
        });
      }
      setMessage("분석 내용이 업데이트되었습니다.");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업데이트에 실패했습니다.");
    } finally {
      setPendingKey(null);
    }
  }

  function updateCategory(category: ProjectInsightCategoryValue) {
    startTransition(() => {
      void callUpdate(
        `/api/projects/${projectId}/insights/${category}/update`,
        { mode: "rules" },
        category,
      );
    });
  }

  function updateAll() {
    startTransition(() => {
      void callUpdate(
        `/api/projects/${projectId}/insights/update-all`,
        {},
        "ALL",
      );
    });
  }

  function saveManual() {
    startTransition(() => {
      void callUpdate(
        `/api/projects/${projectId}/insights/${active}/update`,
        {
          mode: "manual",
          content: {
            summary: draft.summary,
            keyIssues: linesToList(draft.keyIssues),
            saleImpact: draft.saleImpact,
            opportunities: linesToList(draft.opportunities),
            risks: linesToList(draft.risks),
            sourceNotes: draft.sourceNotes,
            sourceUrls: current.sourceUrls,
          },
        },
        `manual-${active}`,
      );
    });
  }

  const busy = isPending || pendingKey !== null;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>진웅산업 분석</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            진웅산업 매각과 관련된 정치·사회·경제·지역 인프라 정보를 정리합니다.
          </p>
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={updateAll}
        >
          {pendingKey === "ALL" ? (
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          전체 업데이트
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PROJECT_INSIGHT_CATEGORIES.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={active === category ? "default" : "outline"}
              onClick={() => {
                setActive(category);
                setEditing(false);
              }}
            >
              {projectInsightCategoryLabels[category]}
            </Button>
          ))}
        </div>

        {insights.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            아직 분석 내용이 없습니다. 전체 업데이트를 실행하세요.
          </p>
        ) : (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">{current.title}</h3>
                <Badge variant="outline">
                  {current.lastUpdatedAt
                    ? `업데이트 ${current.lastUpdatedAt}`
                    : "미업데이트"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={beginEdit}
                >
                  <Pencil data-icon="inline-start" />
                  수동 편집
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => updateCategory(active)}
                >
                  {pendingKey === active ? (
                    <Loader2
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <RefreshCw data-icon="inline-start" />
                  )}
                  {projectInsightCategoryLabels[active]} 업데이트
                </Button>
              </div>
            </div>

            {editing ? (
              <div className="grid gap-3">
                <Field label="요약">
                  <Textarea
                    value={draft.summary}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, summary: e.target.value }))
                    }
                    rows={3}
                  />
                </Field>
                <Field label="핵심 이슈 (줄바꿈 구분)">
                  <Textarea
                    value={draft.keyIssues}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        keyIssues: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </Field>
                <Field label="매각 영향">
                  <Textarea
                    value={draft.saleImpact}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        saleImpact: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </Field>
                <Field label="기회 요인 (줄바꿈 구분)">
                  <Textarea
                    value={draft.opportunities}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        opportunities: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </Field>
                <Field label="리스크 요인 (줄바꿈 구분)">
                  <Textarea
                    value={draft.risks}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, risks: e.target.value }))
                    }
                    rows={3}
                  />
                </Field>
                <Field label="출처/메모">
                  <Textarea
                    value={draft.sourceNotes}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        sourceNotes: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy} onClick={saveManual}>
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setEditing(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 text-sm">
                <Section title="요약" body={current.summary ?? "-"} />
                <ListSection title="핵심 이슈" items={current.keyIssues} />
                <Section title="매각 영향" body={current.saleImpact ?? "-"} />
                <ListSection title="기회 요인" items={current.opportunities} />
                <ListSection title="리스크 요인" items={current.risks} />
                <Section title="출처/메모" body={current.sourceNotes ?? "-"} />
              </div>
            )}
          </div>
        )}

        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-muted-foreground">-</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
