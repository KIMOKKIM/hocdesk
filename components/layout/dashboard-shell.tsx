import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  projects: { value: string; label: string }[];
  dbReady?: boolean;
  displayName?: string;
  avatarInitials?: string;
};

export function DashboardShell({
  children,
  projects,
  dbReady = true,
  displayName = "HOCDESK",
  avatarInitials = "HD",
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          projects={projects}
          dbReady={dbReady}
          displayName={displayName}
          avatarInitials={avatarInitials}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
