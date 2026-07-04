import type { Metadata } from "next";
import { Suspense } from "react";
import { OutreachListPanel } from "@/components/outreach/outreach-list-panel";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";
import { DemoDataToggle } from "@/components/ui/demo-data-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { loadPageData } from "@/lib/db/errors";
import { getOutreachList, getOutreachStats } from "@/lib/db/outreach";
import { resolveIncludeDemo } from "@/lib/demo-filter";

export const metadata: Metadata = {
  title: "이메일 관리",
};

type OutreachPageProps = {
  searchParams: Promise<{ tab?: string; q?: string; includeDemo?: string }>;
};

export default async function OutreachPage({ searchParams }: OutreachPageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "ALL";
  const q = params.q ?? "";
  const includeDemo = resolveIncludeDemo(params.includeDemo);

  const pageData = await loadPageData(() =>
    Promise.all([
      getOutreachList({
        tab: tab === "ALL" ? undefined : tab,
        q: q || undefined,
        includeDemo: params.includeDemo,
      }),
      getOutreachStats(),
    ]),
  );

  if (pageData === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="이메일 관리"
          description="이메일 초안 작성, 승인, 발송 현황을 관리합니다."
        />
        <DbSetupAlert />
      </div>
    );
  }

  const [items, stats] = pageData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="이메일 관리"
        description="이메일 초안 작성, 승인, 발송 현황을 관리합니다."
      />

      <Suspense fallback={null}>
        <DemoDataToggle includeDemo={includeDemo} />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-muted-foreground">로딩 중...</p>}>
        <OutreachListPanel
          items={items}
          stats={stats}
          currentTab={tab}
          currentQuery={q}
        />
      </Suspense>
    </div>
  );
}
