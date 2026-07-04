"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { outreachApprovalLabels, outreachStatusLabels } from "@/lib/constants/labels";
import { OutreachApprovalStatus, OutreachStatus } from "@/lib/constants/status";
import { withBasePath } from "@/lib/paths";
import { Mail, RefreshCw, Send, Trash2 } from "lucide-react";

export type OutreachItem = {
  id: string;
  subject: string;
  emailBody: string;
  status: string;
  approvalStatus: string;
  createdAt: string;
  sentAt: string | null;
  scheduledAt: string | null;
};

type TargetEmailPanelProps = {
  projectCompanyId: string;
  canGenerateEmail?: boolean;
  initialOutreachs: OutreachItem[];
};

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(withBasePath(path), {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

async function apiPatch(path: string, body: unknown) {
  const res = await fetch(withBasePath(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

async function apiDelete(path: string) {
  const res = await fetch(withBasePath(path), { method: "DELETE" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

export function TargetEmailPanel({
  projectCompanyId,
  canGenerateEmail = true,
  initialOutreachs,
}: TargetEmailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    to: string;
    subject: string;
    body: string;
    warnings: string[];
  } | null>(null);

  const activeStatuses = new Set<string>([
    OutreachStatus.DRAFT,
    OutreachStatus.SCHEDULED,
    OutreachStatus.FAILED,
  ]);

  const active =
    initialOutreachs.find(
      (o) =>
        activeStatuses.has(o.status) ||
        o.approvalStatus === OutreachApprovalStatus.PENDING,
    ) ??
    initialOutreachs[0] ??
    null;

  const editableApproval = new Set<string>([
    OutreachApprovalStatus.DRAFT,
    OutreachApprovalStatus.REJECTED,
  ]);

  const [subject, setSubject] = useState(active?.subject ?? "");
  const [emailBody, setEmailBody] = useState(active?.emailBody ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(active?.id ?? null);

  const current = initialOutreachs.find((o) => o.id === selectedId) ?? active;
  const canEdit =
    current &&
    current.status !== OutreachStatus.SENT &&
    editableApproval.has(current.approvalStatus);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  function selectOutreach(item: OutreachItem) {
    setSelectedId(item.id);
    setSubject(item.subject);
    setEmailBody(item.emailBody);
    setPreview(null);
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" />
          제안 이메일
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isPending || !canGenerateEmail}
            onClick={() =>
              run(async () => {
                const data = await apiPost("/api/outreach/generate", {
                  projectCompanyId,
                });
                setSelectedId(data.outreach.id);
                setSubject(data.outreach.subject);
                setEmailBody(data.outreach.emailBody);
              })
            }
          >
            {current ? "다시 생성" : "제안 이메일 생성"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canGenerateEmail ? (
          <p className="text-sm text-muted-foreground">
            연락 준비 완료(CONTACT_READY) 상태에서만 이메일 초안을 생성할 수
            있습니다.
          </p>
        ) : null}
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {initialOutreachs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {initialOutreachs.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={selectedId === item.id ? "default" : "outline"}
                onClick={() => selectOutreach(item)}
              >
                {outreachApprovalLabels[item.approvalStatus] ?? item.approvalStatus}
                {" · "}
                {outreachStatusLabels[item.status] ?? item.status}
              </Button>
            ))}
          </div>
        )}

        {current ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {outreachStatusLabels[current.status] ?? current.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {emailBody.length}자
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">제목</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!canEdit || isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-body">본문</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                disabled={!canEdit || isPending}
                rows={14}
                className="font-mono text-sm leading-6"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        await apiPatch(`/api/outreach/${current.id}`, {
                          subject,
                          emailBody,
                        });
                      })
                    }
                  >
                    직접 수정 저장
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        await apiPost(
                          `/api/outreach/${current.id}/request-approval`,
                        );
                      })
                    }
                  >
                    승인 요청
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        if (confirm("이 초안을 삭제하시겠습니까?")) {
                          await apiDelete(`/api/outreach/${current.id}`);
                          setSelectedId(null);
                          setSubject("");
                          setEmailBody("");
                        }
                      })
                    }
                  >
                    <Trash2 data-icon="inline-start" />
                    초안 삭제
                  </Button>
                </>
              )}

              {(current.approvalStatus === OutreachApprovalStatus.DRAFT ||
                current.approvalStatus === OutreachApprovalStatus.REJECTED) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    run(async () => {
                      await apiPost(
                        `/api/outreach/${current.id}/submit-approval`,
                      );
                    })
                  }
                >
                  승인 요청
                </Button>
              )}

              {current.approvalStatus === OutreachApprovalStatus.PENDING && (
                <>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        await apiPost(`/api/outreach/${current.id}/approve`);
                      })
                    }
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        await apiPost(`/api/outreach/${current.id}/reject`, {
                          reason: "내용 보완 필요",
                        });
                      })
                    }
                  >
                    거절
                  </Button>
                </>
              )}

              {current.approvalStatus === OutreachApprovalStatus.APPROVED &&
                current.status !== OutreachStatus.SENT && (
                <>
                  {current.status === OutreachStatus.DRAFT && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        run(async () => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(9, 0, 0, 0);
                          await apiPost(`/api/outreach/${current.id}/schedule`, {
                            scheduledAt: tomorrow.toISOString(),
                          });
                        })
                      }
                    >
                      발송 예약
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        const res = await fetch(
                          withBasePath(`/api/outreach/${current.id}/send`),
                          { method: "POST" },
                        );
                        const data = await res.json();
                        if (!data.ok) throw new Error(data.error);
                        setPreview(null);
                      })
                    }
                  >
                    <Send data-icon="inline-start" />
                    발송 (console)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        const res = await fetch(
                          withBasePath(`/api/outreach/${current.id}/send`),
                        );
                        const data = await res.json();
                        if (!data.ok) throw new Error(data.error);
                        setPreview({
                          to: data.preview?.to ?? "",
                          subject: data.preview?.subject ?? subject,
                          body: data.preview?.body ?? emailBody,
                          warnings: data.warnings ?? [],
                        });
                      })
                    }
                  >
                    <RefreshCw data-icon="inline-start" />
                    발송 미리보기
                  </Button>
                </>
              )}
            </div>

            {preview && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">발송 미리보기</p>
                <p className="mt-2 text-muted-foreground">수신: {preview.to}</p>
                <p className="text-muted-foreground">제목: {preview.subject}</p>
                {preview.warnings.map((w) => (
                  <p key={w} className="mt-1 text-amber-600">
                    ⚠ {w}
                  </p>
                ))}
                <pre className="mt-3 whitespace-pre-wrap text-xs leading-6">
                  {preview.body}
                </pre>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 생성된 제안 이메일이 없습니다. 위 버튼으로 초안을 생성하세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
