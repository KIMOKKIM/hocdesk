import { redirect } from "next/navigation";
import { isAdminAuthenticated, isAdminProtectionEnabled } from "@/lib/auth/admin-session";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isAdminProtectionEnabled() && (await isAdminAuthenticated())) {
    redirect("/dashboard");
  }
  return children;
}
