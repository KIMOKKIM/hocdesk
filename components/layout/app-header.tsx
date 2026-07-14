"use client";

import { Bell, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withBasePath } from "@/lib/paths";

type AppHeaderProps = {
  projects?: { value: string; label: string }[];
  dbReady?: boolean;
  displayName?: string;
  avatarInitials?: string;
};

function formatTodayDate() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function projectSelectorLabel(projects: { label: string }[], dbReady: boolean) {
  if (!dbReady) return "DB 초기화 필요";
  if (projects.length === 0) return "프로젝트 없음";
  return "프로젝트 선택";
}

export function AppHeader({
  projects = [],
  dbReady = true,
  displayName = "HOCDESK",
  avatarInitials = "HD",
}: AppHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const placeholder = projectSelectorLabel(projects, dbReady);
  const hasProjects = dbReady && projects.length > 0;

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            현재 프로젝트
          </span>
          <Select
            disabled={!hasProjects}
            defaultValue={hasProjects ? projects[0]?.value : undefined}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            {hasProjects ? (
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            ) : null}
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <p className="hidden text-sm text-muted-foreground lg:block">
          {formatTodayDate()}
        </p>

        <Button variant="outline" size="icon" className="relative">
          <Bell className="size-4" />
          <Badge className="absolute -right-1 -top-1 size-5 rounded-full p-0 text-[10px]">
            3
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">
                  {displayName}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>{displayName}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              설정
            </DropdownMenuItem>
            <DropdownMenuItem disabled={loggingOut} onClick={() => void handleLogout()}>
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
