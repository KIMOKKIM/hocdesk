import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProjectSearchQuality } from "@/lib/db/search-quality";
import { formatDateTime } from "@/lib/format";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  return { title: project ? `${project.name} 검색 품질` : "검색 품질" };
}

export default async function SearchQualityPage({ params }: Props) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const quality = await getProjectSearchQuality(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="검색 품질"
        description={`${project.name} · 데모 Provider 제외`}
        action={
          <Link href={`/projects/${id}`} className="text-sm text-primary hover:underline">
            프로젝트로
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Kakao 작업" value={quality.totals.jobCount} />
        <Stat label="ACCEPT 비율" value={`${quality.totals.acceptRate}%`} />
        <Stat label="중복률" value={`${quality.totals.duplicateRate}%`} />
        <Stat label="전화번호 보유율" value={`${quality.totals.phoneRate}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>업종별 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">업종</th>
                <th className="pb-2">원본</th>
                <th className="pb-2">등록</th>
                <th className="pb-2">중복</th>
                <th className="pb-2">제외</th>
              </tr>
            </thead>
            <tbody>
              {quality.bySegment.map((row) => (
                <tr key={row.segment} className="border-b last:border-0">
                  <td className="py-2">{row.segment}</td>
                  <td className="py-2">{row.raw}</td>
                  <td className="py-2">{row.accepted}</td>
                  <td className="py-2">{row.duplicate}</td>
                  <td className="py-2">{row.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 검색 작업</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {quality.recentJobs.map((job) => (
            <div key={job.id} className="flex justify-between rounded border p-3">
              <Link href={`/collection-jobs/${job.id}`} className="text-primary hover:underline">
                {job.provider} · {job.status}
              </Link>
              <span className="text-muted-foreground">
                {formatDateTime(job.createdAt)} · 신규 {job.acceptedCount}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
