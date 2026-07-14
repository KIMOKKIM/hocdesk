import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TargetReviewPanel } from "@/components/targets/target-review-panel";
import { TargetVerificationPanel } from "@/components/targets/target-verification-panel";
import { TargetEmailPanel } from "@/components/outreach/target-email-panel";
import { ExcludeTargetButton } from "@/components/targets/exclude-target-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import {
  outreachStatusLabels,
} from "@/lib/constants/labels";
import { getTargetById } from "@/lib/db/targets";
import { formatDateTime } from "@/lib/format";
import { isContactReadyStatus } from "@/lib/review/target-review-service";
import { ArrowLeft, Mail, Pencil } from "lucide-react";

type TargetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: TargetDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const target = await getTargetById(id);
  return { title: target?.company.companyName ?? "타깃 상세" };
}

export default async function TargetDetailPage({
  params,
}: TargetDetailPageProps) {
  const { id } = await params;
  const target = await getTargetById(id);

  if (!target) {
    notFound();
  }

  const { company } = target;
  const scoreItems = [
    { label: "종합 적합도", value: target.fitScore },
    { label: "재무", value: target.financialScore },
    { label: "입지", value: target.locationScore },
    { label: "시설 니즈", value: target.facilityNeedScore },
    { label: "확장 시그널", value: target.expansionSignalScore },
    { label: "의사결정자", value: target.decisionMakerScore },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.companyName}
        description={`${target.project.name} · ${company.region ?? ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/targets" />}>
              <ArrowLeft data-icon="inline-start" />
              목록
            </Button>
            <Button render={<Link href={`/targets/${id}/edit`} />}>
              <Pencil data-icon="inline-start" />
              수정
            </Button>
            <ExcludeTargetButton projectCompanyId={id} />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{target.targetGrade}등급</Badge>
        <Badge variant="outline">{target.reviewStatusLabel}</Badge>
        <Badge variant="secondary">{target.companyStatusLabel}</Badge>
        <Badge variant={target.isDemo ? "outline" : "default"}>
          {target.isDemo ? "데모 업체" : "실제 업체"}
        </Badge>
        {target.primarySource ? (
          <>
            <Badge variant="outline">{target.sourceTypeLabel}</Badge>
            <Badge variant="secondary">
              신뢰도 {target.sourceConfidenceLabel}
            </Badge>
          </>
        ) : null}
      </div>

      <TargetReviewPanel
        projectCompanyId={id}
        projectName={target.project.name}
        reviewStatus={target.reviewStatus}
        fitScore={target.fitScore}
        targetGrade={target.targetGrade}
        recommendedUse={target.recommendedUse}
        targetingReason={target.targetingReason}
        riskFactors={target.riskFactors}
        hasContact={target.hasContact}
        hasVerifiedEmail={target.hasVerifiedEmail}
        lastContactAt={target.lastContactAt}
        nextActionDate={target.nextActionDate}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>업체 기본정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">업종군</dt>
                <dd className="font-medium">{company.industryGroup ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">세부 업종</dt>
                <dd className="font-medium">{company.detailedIndustry ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">지역</dt>
                <dd className="font-medium">{company.region ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">추정 매출</dt>
                <dd className="font-medium">{company.estimatedRevenue ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">현재 시설</dt>
                <dd className="font-medium">
                  {company.currentFacilityType ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">임직원 수</dt>
                <dd className="font-medium">
                  {company.employeeCount ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">대표 전화</dt>
                <dd className="font-medium">{company.mainPhone ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">대표 이메일</dt>
                <dd className="font-medium">{company.generalEmail ?? "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>적합도</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoreItems.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{item.value}점</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>추천 활용방안</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7">
              {target.recommendedUse ?? "등록된 내용이 없습니다."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>타깃 선정사유</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7">
              {target.targetingReason ?? "등록된 내용이 없습니다."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>위험요소</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7">
              {target.riskFactors ?? "등록된 내용이 없습니다."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>출처</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">출처 정보 없음</p>
            ) : (
              company.sources.map((source) => (
                <div key={source.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{source.sourceType}</p>
                    {source.provider ? (
                      <Badge variant="outline">{source.provider}</Badge>
                    ) : null}
                    {source.sourceConfidence ? (
                      <Badge variant="secondary">{source.sourceConfidence}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {source.discoveredReason ?? "-"}
                  </p>
                  {source.sourceUrl ? (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-primary hover:underline"
                    >
                      출처 URL
                    </a>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    최초 발견 {formatDateTime(source.collectedAt)}
                    {source.searchKeyword ? ` · 검색어 ${source.searchKeyword}` : ""}
                    {source.lastVerifiedAt
                      ? ` · 확인 ${formatDateTime(source.lastVerifiedAt)}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>연락처</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">연락처 없음</p>
            ) : (
              company.contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {contact.contactName ?? "담당자 미상"}
                    {contact.jobTitle ? ` · ${contact.jobTitle}` : ""}
                  </p>
                  <p className="mt-1">{contact.email ?? "-"}</p>
                  <p className="text-muted-foreground">{contact.mobile ?? "-"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <TargetVerificationPanel
        projectCompanyId={id}
        initial={{
          website: company.website,
          generalEmail: company.generalEmail,
          mainPhone: company.mainPhone,
          verificationMemo: company.verificationMemo,
          detailedIndustry: company.detailedIndustry,
          currentFacilityType: company.currentFacilityType,
          contactName: company.contacts[0]?.contactName ?? null,
          contactTitle: company.contacts[0]?.jobTitle ?? null,
          contactEmail: company.contacts[0]?.email ?? null,
          sourceUrl: target.primarySource?.sourceUrl ?? null,
        }}
      />

      <TargetEmailPanel
        projectCompanyId={id}
        canGenerateEmail={isContactReadyStatus(target.reviewStatus)}
        hasEmail={target.hasEmail}
        initialOutreachs={target.outreachs.map((o) => ({
          id: o.id,
          subject: o.subject,
          emailBody: o.emailBody,
          status: o.status,
          approvalStatus: o.approvalStatus,
          createdAt: o.createdAt.toISOString(),
          sentAt: o.sentAt?.toISOString() ?? null,
          scheduledAt: o.scheduledAt?.toISOString() ?? null,
        }))}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>접촉 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {target.outreachs.length === 0 ? (
            <p className="text-sm text-muted-foreground">접촉 이력 없음</p>
          ) : (
            target.outreachs.map((outreach) => (
              <div
                key={outreach.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{outreach.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(outreach.sentAt ?? outreach.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline">
                    {outreachStatusLabels[outreach.status] ?? outreach.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        최종 수정: {formatDateTime(target.updatedAt)}
      </p>
    </div>
  );
}
