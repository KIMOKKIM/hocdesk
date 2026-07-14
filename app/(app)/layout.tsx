import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DbSetupAlert } from "@/components/ui/db-setup-alert";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import {
  getAdminAvatarInitials,
  getAdminDisplayName,
} from "@/lib/config/admin-display";
import {
  isProductionEnvironment,
  resolveDatabaseProvider,
} from "@/lib/db/database-provider";
import { loadPageData } from "@/lib/db/errors";
import { getProjectOptions } from "@/lib/db/projects";
import { hasTursoEnv } from "@/lib/db/turso-env";
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
  const dbReady = projects !== null;
  const displayName = getAdminDisplayName();
  const avatarInitials = getAdminAvatarInitials(displayName);

  let databaseProvider = "sqlite";
  try {
    databaseProvider = resolveDatabaseProvider();
  } catch {
    databaseProvider = process.env.DATABASE_PROVIDER?.trim() || "sqlite";
  }

  return (
    <DashboardShell
      projects={projects ?? []}
      dbReady={dbReady}
      displayName={displayName}
      avatarInitials={avatarInitials}
    >
      {!dbReady ? (
        <div className="mb-6">
          <DbSetupAlert
            databaseProvider={databaseProvider}
            isProduction={isProductionEnvironment()}
            hasTursoCredentials={hasTursoEnv()}
          />
        </div>
      ) : null}
      {children}
    </DashboardShell>
  );
}
