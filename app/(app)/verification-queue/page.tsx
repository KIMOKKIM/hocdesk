import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getVerificationQueue } from "@/lib/db/verification-queue";

export const metadata: Metadata = { title: "정보 보강 작업함" };

export default async function VerificationQueuePage() {
  const { items, topRecommendations } = await getVerificationQueue(50);

  return (
    <div className="space-y-6">
      <PageHeader
        title="정보 보강 작업함"
        description="실제 업체 중 연락처·홈페이지 확인이 필요한 항목입니다."
      />

      <Card>
        <CardHeader>
          <CardTitle>오늘 우선 처리 추천 (상위 10)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {topRecommendations.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 rounded border p-3">
              <Link href={`/targets/${item.id}`} className="font-medium text-primary hover:underline">
                {item.companyName}
              </Link>
              <Badge>{item.priority}점</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>전체 대기 ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">업체</th>
                  <th className="pb-2">등급</th>
                  <th className="pb-2">전화</th>
                  <th className="pb-2">이메일</th>
                  <th className="pb-2">우선순위</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link href={`/targets/${item.id}`} className="text-primary hover:underline">
                        {item.companyName}
                      </Link>
                    </td>
                    <td className="py-3">{item.targetGrade}</td>
                    <td className="py-3">{item.mainPhone ?? "-"}</td>
                    <td className="py-3">{item.generalEmail ?? "미확인"}</td>
                    <td className="py-3">{item.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
