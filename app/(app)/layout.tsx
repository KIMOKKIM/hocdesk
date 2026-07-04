import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { loadPageData } from "@/lib/db/errors";
import { getProjectOptions } from "@/lib/db/projects";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/login");
  }

  const projects = await loadPageData(() => getProjectOptions());

  if (projects === null) {
    return (
      <DashboardShell projects={[]}>
        <div className="p-6">
          <DbSetupAlert />
        </div>
      </DashboardShell>
    );
  }

  return <DashboardShell projects={projects}>{children}</DashboardShell>;
}
