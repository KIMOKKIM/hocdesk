import type { Metadata } from "next";
import Link from "next/link";
import { TargetForm } from "@/components/targets/target-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultProjectId } from "@/lib/db/targets";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "타깃 등록",
};

export default async function NewTargetPage() {
  const projectId = await getDefaultProjectId();

  return (
    <div className="space-y-6">
      <PageHeader
        title="타깃 업체 등록"
        description="프로젝트에 신규 타깃 업체를 수동으로 등록합니다."
        action={
          <Button variant="outline" render={<Link href="/targets" />}>
            <ArrowLeft data-icon="inline-start" />
            목록
          </Button>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>업체 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <TargetForm mode="create" projectId={projectId ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
