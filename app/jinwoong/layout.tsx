import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { JinwoongSidebar } from "@/components/jinwoong/sidebar";
import { ConfidentialFooter } from "@/components/jinwoong/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JinwoongLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <JinwoongSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
        <div className="px-6 pb-6 lg:px-8">
          <ConfidentialFooter />
        </div>
      </div>
    </div>
  );
}
