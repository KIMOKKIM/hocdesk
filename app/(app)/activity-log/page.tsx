import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getActivityLogs } from "@/lib/audit/activity-log-service";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "감사 로그" };

export default async function ActivityLogPage() {
  const logs = await getActivityLogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <PageHeader title="감사 로그" description="수집·검토·아웃리치 이벤트 기록" />
      <Card>
        <CardHeader>
          <CardTitle>최근 이벤트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">일시</th>
                  <th className="pb-2">이벤트</th>
                  <th className="pb-2">프로젝트</th>
                  <th className="pb-2">요약</th>
                  <th className="pb-2">주체</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-3 text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3">{log.eventType}</td>
                    <td className="py-3">{log.project?.name ?? "-"}</td>
                    <td className="py-3">{log.summary}</td>
                    <td className="py-3">{log.actorType}</td>
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
