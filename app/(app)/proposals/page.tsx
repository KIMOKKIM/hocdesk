import type { Metadata } from "next";
import Link from "next/link";
import { ExpansionSuggestionCard } from "@/components/proposals/expansion-suggestion-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProjectOptions } from "@/lib/db/projects";
import { getExpansionSuggestionsByProject } from "@/lib/db/expansion-suggestions";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "신규 타깃 제안",
};

export default async function ProposalsPage() {
  const projects = await getProjectOptions();
  const projectId = projects[0]?.value;
  const suggestions = projectId
    ? await getExpansionSuggestionsByProject(projectId)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="신규 타깃 제안"
        description="일일 업무 분석에서 도출된 신규 타깃 확장 제안을 검토하고 승인합니다."
        action={
          <Button render={<Link href="/activities/new" />}>
            <Plus data-icon="inline-start" />
            일일 업무 입력
          </Button>
        }
      />

      {suggestions.length === 0 ? (
        <EmptyState
          title="제안이 없습니다"
          description="일일 업무를 입력·분석하면 신규 타깃 제안이 생성됩니다."
          actionLabel="활동 작성"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {suggestions.map((suggestion) => (
            <ExpansionSuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );
}
