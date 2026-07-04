"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  outreachApprovalLabels,
  outreachStatusLabels,
} from "@/lib/constants/labels";
import { formatDateTime } from "@/lib/format";
import { withBasePath } from "@/lib/paths";
import { Mail } from "lucide-react";

export type OutreachListItem = {
  id: string;
  subject: string;
  status: string;
  approvalStatus: string;
  createdAt: Date;
  approvedAt: Date | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  nextActionDate: Date | null;
  company: { companyName: string; region: string | null };
  project: { name: string };
  contact: { contactName: string | null; email: string | null } | null;
};

export type OutreachStats = {
  draft: number;
  pending: number;
  approved: number;
  scheduled: number;
  sent: number;
  replied: number;
  failed: number;
  cancelled: number;
  todaySent: number;
  nextAction: number;
  suppressed: number;
  approvalRate: number;
  replyRate: number;
};

const TABS = [
  { key: "ALL", label: "전체" },
  { key: "DRAFT", label: "초안" },
  { key: "PENDING", label: "승인대기" },
  { key: "APPROVED", label: "승인완료" },
  { key: "SCHEDULED", label: "예약" },
  { key: "SENT", label: "발송완료" },
  { key: "REPLIED", label: "회신" },
  { key: "FAILED", label: "실패" },
  { key: "CANCELLED", label: "취소" },
];

export function OutreachListPanel({
  items,
  stats,
  currentTab,
  currentQuery,
}: {
  items: OutreachListItem[];
  stats: OutreachStats;
  currentTab: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setFilter(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "ALL") params.delete("tab");
    else params.set("tab", tab);
    startTransition(() => {
      router.push(`/outreach?${params.toString()}`);
    });
  }

  function onSearch(formData: FormData) {
    const q = String(formData.get("q") ?? "");
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    startTransition(() => {
      router.push(`/outreach?${params.toString()}`);
    });
  }

  async function processScheduled() {
    const res = await fetch(withBasePath("/api/outreach/process-scheduled"), {
      method: "POST",
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error ?? "처리 실패");
      return;
    }
    alert(`예약 발송 ${data.processed}건 처리`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "초안", value: stats.draft },
          { label: "승인 대기", value: stats.pending },
          { label: "승인 완료", value: stats.approved },
          { label: "오늘 발송", value: stats.todaySent },
        ].map((card) => (
          <Card key={card.label} className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={currentTab === tab.key ? "default" : "outline"}
            disabled={isPending}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
        <Button size="sm" variant="secondary" onClick={processScheduled}>
          예약 발송 실행
        </Button>
      </div>

      <form action={onSearch} className="flex gap-2">
        <Input
          name="q"
          defaultValue={currentQuery}
          placeholder="업체명 또는 제목 검색"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary" disabled={isPending}>
          검색
        </Button>
      </form>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>이메일 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">표시할 이메일이 없습니다.</p>
          ) : (
            items.map((email) => (
              <Link
                key={email.id}
                href={`/outreach/${email.id}`}
                className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/20"
              >
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{email.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {email.company.companyName} · {email.project.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {email.contact?.email ?? "수신자 없음"} ·{" "}
                      {formatDateTime(email.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">
                    {outreachApprovalLabels[email.approvalStatus] ??
                      email.approvalStatus}
                  </Badge>
                  <Badge>
                    {outreachStatusLabels[email.status] ?? email.status}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        EMAIL_PROVIDER=console — 실제 외부 발송 없이 서버 로그에 기록됩니다.
        process-scheduled API는 운영 배포 전 인증 보호가 필요합니다.
      </p>
    </div>
  );
}
