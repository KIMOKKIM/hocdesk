import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { DbSetupPageNotice } from "@/components/ui/db-setup-page-notice";
import { PageHeader } from "@/components/ui/page-header";
import { loadPageData } from "@/lib/db/errors";
import { getSearchProviderStatus } from "@/lib/db/search-provider-status";
import { getSenderProfile, getSuppressionList } from "@/lib/db/settings";

export const metadata: Metadata = {
  title: "설정",
};

export default async function SettingsPage() {
  const pageData = await loadPageData(() =>
    Promise.all([
      getSenderProfile(),
      getSuppressionList(),
      getSearchProviderStatus(),
    ]),
  );

  if (pageData === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="설정"
          description="발신자 프로필과 수신거부 목록을 관리합니다."
        />
        <DbSetupPageNotice resource="설정" />
      </div>
    );
  }

  const [senderProfile, suppressionList, searchProviderStatus] = pageData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="설정"
        description="발신자 프로필, 수신거부 목록, 이메일 발송 설정을 관리합니다."
      />
      <SettingsForm
        initialProfile={senderProfile}
        initialSuppression={suppressionList}
        searchProviderStatus={searchProviderStatus}
      />
    </div>
  );
}
