"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  outreachApprovalLabels,
  outreachStatusLabels,
} from "@/lib/constants/labels";
import {
  OutreachApprovalStatus,
  OutreachStatus,
} from "@/lib/constants/status";
import { formatDateTime } from "@/lib/format";
import { withBasePath } from "@/lib/paths";

type OutreachDetail = {
  id: string;
  subject: string;
  emailBody: string;
  status: string;
  approvalStatus: string;
  emailType: string;
  templateType: string | null;
  generationMethod: string | null;
  draftVersion: number;
  approvedAt: Date | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  repliedAt: Date | null;
  replyType: string | null;
  replySummary: string | null;
  nextActionDate: Date | null;
  rejectionReason: string | null;
  provider: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  company: {
    companyName: string;
    region: string | null;
    industryGroup: string | null;
    detailedIndustry: string | null;
  };
  project: { name: string; location: string | null };
  contact: { contactName: string | null; email: string | null; jobTitle: string | null } | null;
  projectCompany: {
    recommendedUse: string | null;
    targetingReason: string | null;
    fitScore: number;
  } | null;
};

async function apiCall(
  path: string,
  method: string,
  body?: unknown,
) {
  const res = await fetch(withBasePath(path), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

export function OutreachDetailPanel({ outreach }: { outreach: OutreachDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(outreach.subject);
  const [emailBody, setEmailBody] = useState(outreach.emailBody);
  const [scheduleAt, setScheduleAt] = useState("");
  const [replySummary, setReplySummary] = useState("");
  const [replyType, setReplyType] = useState("INTERESTED");

  const canEdit =
    outreach.status !== OutreachStatus.SENT &&
    outreach.status !== OutreachStatus.CANCELLED;

  function run(action: () => Promise<void>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "처리 실패");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          승인: {outreachApprovalLabels[outreach.approvalStatus] ?? outreach.approvalStatus}
        </Badge>
        <Badge>
          발송: {outreachStatusLabels[outreach.status] ?? outreach.status}
        </Badge>
        {outreach.templateType ? (
          <Badge variant="secondary">{outreach.templateType}</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>이메일 내용</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">제목</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">본문</Label>
                  <Textarea
                    id="body"
                    rows={16}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      run(async () => {
                        await apiCall(`/api/outreach/${outreach.id}`, "PATCH", {
                          subject,
                          emailBody,
                        });
                        setEditing(false);
                        setMessage("수정 저장 완료");
                      })
                    }
                  >
                    저장
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    취소
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium">{outreach.subject}</p>
                <pre className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-7">
                  {outreach.emailBody}
                </pre>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>업체·프로젝트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">업체: </span>
              {outreach.company.companyName}
            </p>
            <p>
              <span className="text-muted-foreground">수신: </span>
              {outreach.contact?.email ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">프로젝트: </span>
              {outreach.project.name}
            </p>
            <p>
              <span className="text-muted-foreground">생성: </span>
              {outreach.generationMethod ?? "-"} v{outreach.draftVersion}
            </p>
            <p>
              <span className="text-muted-foreground">선정사유: </span>
              {outreach.projectCompany?.targetingReason ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">활용방안: </span>
              {outreach.projectCompany?.recommendedUse ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>작업</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button variant="outline" disabled={isPending} onClick={() => setEditing(true)}>
                직접 수정
              </Button>
            ) : null}
            {outreach.approvalStatus === OutreachApprovalStatus.DRAFT ||
            outreach.approvalStatus === OutreachApprovalStatus.REJECTED ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    await apiCall(
                      `/api/outreach/${outreach.id}/submit-approval`,
                      "POST",
                    );
                    setMessage("승인 요청 완료");
                  })
                }
              >
                승인 요청
              </Button>
            ) : null}
            {outreach.approvalStatus === OutreachApprovalStatus.PENDING ? (
              <>
                <Button
                  disabled={isPending}
                  onClick={() =>
                    run(async () => {
                      await apiCall(`/api/outreach/${outreach.id}/approve`, "POST");
                      setMessage("승인 완료");
                    })
                  }
                >
                  승인
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    run(async () => {
                      await apiCall(`/api/outreach/${outreach.id}/reject`, "POST", {
                        reason: "업체 특성 반영 부족",
                      });
                      setMessage("거절 처리");
                    })
                  }
                >
                  거절
                </Button>
              </>
            ) : null}
            {outreach.approvalStatus === OutreachApprovalStatus.APPROVED &&
            [OutreachStatus.DRAFT, OutreachStatus.SCHEDULED, OutreachStatus.FAILED].includes(
              outreach.status as typeof OutreachStatus.DRAFT,
            ) ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    await apiCall(`/api/outreach/${outreach.id}/send`, "POST");
                    setMessage("발송 완료 (ConsoleProvider)");
                  })
                }
              >
                즉시 발송
              </Button>
            ) : null}
            {outreach.approvalStatus === OutreachApprovalStatus.APPROVED &&
            outreach.status === OutreachStatus.DRAFT ? (
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="scheduleAt">예약 발송</Label>
                  <Input
                    id="scheduleAt"
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={isPending || !scheduleAt}
                  onClick={() =>
                    run(async () => {
                      await apiCall(`/api/outreach/${outreach.id}/schedule`, "POST", {
                        scheduledAt: new Date(scheduleAt).toISOString(),
                      });
                      setMessage("예약 완료");
                    })
                  }
                >
                  예약
                </Button>
              </div>
            ) : null}
            {outreach.status === OutreachStatus.SENT ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="flex h-9 rounded-lg border px-3 text-sm"
                  value={replyType}
                  onChange={(e) => setReplyType(e.target.value)}
                >
                  <option value="INTERESTED">관심</option>
                  <option value="REQUESTED_INFO">자료 요청</option>
                  <option value="FOLLOW_UP">후속 필요</option>
                  <option value="HOLD">보류</option>
                  <option value="REJECTED">거절</option>
                  <option value="UNSUBSCRIBE">수신거부</option>
                  <option value="OTHER">기타</option>
                </select>
                <Input
                  placeholder="회신 요약"
                  value={replySummary}
                  onChange={(e) => setReplySummary(e.target.value)}
                />
                <Button
                  disabled={isPending || !replySummary}
                  onClick={() =>
                    run(async () => {
                      await apiCall(`/api/outreach/${outreach.id}/reply`, "POST", {
                        replyType,
                        replySummary,
                      });
                      setMessage("회신 등록 완료");
                    })
                  }
                >
                  회신 등록
                </Button>
              </div>
            ) : null}
          </div>

          {!canEdit && outreach.status === OutreachStatus.SENT ? (
            <p className="text-xs text-muted-foreground">
              발송 완료된 이메일은 본문을 수정할 수 없습니다.
            </p>
          ) : null}
          {outreach.approvalStatus !== OutreachApprovalStatus.APPROVED &&
          outreach.status !== OutreachStatus.SENT ? (
            <p className="text-xs text-muted-foreground">
              승인되지 않은 이메일은 발송할 수 없습니다.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>발송 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>생성: {formatDateTime(outreach.createdAt)}</p>
          {outreach.approvedAt ? (
            <p>승인: {formatDateTime(outreach.approvedAt)}</p>
          ) : null}
          {outreach.scheduledAt ? (
            <p>예약: {formatDateTime(outreach.scheduledAt)}</p>
          ) : null}
          {outreach.sentAt ? <p>발송: {formatDateTime(outreach.sentAt)}</p> : null}
          {outreach.repliedAt ? (
            <p>회신: {formatDateTime(outreach.repliedAt)}</p>
          ) : null}
          {outreach.providerMessageId ? (
            <p className="text-muted-foreground">ID: {outreach.providerMessageId}</p>
          ) : null}
          {outreach.errorMessage ? (
            <p className="text-destructive">{outreach.errorMessage}</p>
          ) : null}
          {outreach.rejectionReason ? (
            <p className="text-destructive">거절: {outreach.rejectionReason}</p>
          ) : null}
        </CardContent>
      </Card>

      <Button variant="outline" render={<Link href="/outreach" />}>
        목록으로
      </Button>
    </div>
  );
}
