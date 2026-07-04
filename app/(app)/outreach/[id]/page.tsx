import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OutreachDetailPanel } from "@/components/outreach/outreach-detail-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getOutreachById } from "@/lib/db/outreach";

type OutreachDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: OutreachDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const outreach = await getOutreachById(id);
  return { title: outreach?.subject ?? "이메일 상세" };
}

export default async function OutreachDetailPage({
  params,
}: OutreachDetailPageProps) {
  const { id } = await params;
  const outreach = await getOutreachById(id);

  if (!outreach) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="이메일 상세"
        description={`${outreach.company.companyName} · ${outreach.project.name}`}
      />
      <OutreachDetailPanel outreach={outreach} />
    </div>
  );
}
