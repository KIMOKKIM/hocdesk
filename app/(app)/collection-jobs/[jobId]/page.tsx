import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionJobDetailClient } from "@/components/collection/collection-job-detail-client";
import { getCollectionJobDetail } from "@/lib/db/collection-jobs";

type CollectionJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({
  params,
}: CollectionJobPageProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getCollectionJobDetail(jobId);
  return { title: job ? `수집 작업 ${job.statusLabel}` : "수집 작업" };
}

export default async function CollectionJobPage({ params }: CollectionJobPageProps) {
  const { jobId } = await params;
  const job = await getCollectionJobDetail(jobId);

  if (!job) {
    notFound();
  }

  return <CollectionJobDetailClient job={job} />;
}
