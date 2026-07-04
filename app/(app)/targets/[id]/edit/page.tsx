import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TargetForm } from "@/components/targets/target-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTargetById } from "@/lib/db/targets";
import { ArrowLeft } from "lucide-react";

type EditTargetPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditTargetPageProps): Promise<Metadata> {
  const { id } = await params;
  const target = await getTargetById(id);
  return { title: target ? `${target.company.companyName} 수정` : "타깃 수정" };
}

export default async function EditTargetPage({ params }: EditTargetPageProps) {
  const { id } = await params;
  const target = await getTargetById(id);

  if (!target) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="타깃 업체 수정"
        description={target.company.companyName}
        action={
          <Button variant="outline" render={<Link href={`/targets/${id}`} />}>
            <ArrowLeft data-icon="inline-start" />
            상세로
          </Button>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>업체 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <TargetForm
            mode="edit"
            projectCompanyId={id}
            defaultValues={{
              companyName: target.company.companyName,
              industryGroup: target.company.industryGroup,
              detailedIndustry: target.company.detailedIndustry,
              region: target.company.region,
              estimatedRevenue: target.company.estimatedRevenue,
              currentFacilityType: target.company.currentFacilityType,
              mainPhone: target.company.mainPhone,
              generalEmail: target.company.generalEmail,
              targetGrade: target.targetGrade,
              fitScore: target.fitScore,
              recommendedUse: target.recommendedUse,
              targetingReason: target.targetingReason,
              riskFactors: target.riskFactors,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
