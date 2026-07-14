import type { Metadata } from "next";
import { SearchCandidatesPanel } from "@/components/search-candidates/search-candidates-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getDiscoveredCandidates } from "@/lib/collection/discovered-candidate-service";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "검색 후보 검토" };

type Props = { searchParams: Promise<{ jobId?: string; projectId?: string }> };

export default async function SearchCandidatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const items = await getDiscoveredCandidates({
    limit: 100,
    collectionJobId: params.jobId,
    projectId: params.projectId,
  });

  const mapped = items.map((item) => ({
    ...item,
    address: item.address ?? item.roadAddress ?? null,
    discoveredAt: formatDateTime(item.discoveredAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="검색 후보 검토"
        description="실제 검색 결과를 Company DB에 등록하기 전 검토합니다."
      />
      <SearchCandidatesPanel initialItems={mapped} />
    </div>
  );
}
