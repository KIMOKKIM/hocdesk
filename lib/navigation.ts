import {
  Activity,
  Building2,
  History,
  LayoutDashboard,
  Lightbulb,
  Mail,
  Search,
  Settings,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { title: "매각 프로젝트", href: "/projects", icon: Briefcase },
  { title: "타깃 업체", href: "/targets", icon: Building2 },
  { title: "검색 후보", href: "/search-candidates", icon: Search },
  { title: "정보 보강", href: "/verification-queue", icon: ShieldCheck },
  { title: "일일 활동", href: "/activities", icon: Activity },
  { title: "신규 타깃 제안", href: "/expansion-suggestions", icon: Lightbulb },
  { title: "이메일 관리", href: "/outreach", icon: Mail },
  { title: "감사 로그", href: "/activity-log", icon: History },
  { title: "설정", href: "/settings", icon: Settings },
];
