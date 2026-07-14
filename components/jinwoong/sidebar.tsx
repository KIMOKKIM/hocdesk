"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JINWOONG_NAV } from "@/lib/jinwoong/constants";
import { withBasePath } from "@/lib/paths";
import { cn } from "@/lib/utils";

export function JinwoongSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-[#0b1f3a] text-slate-100">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs tracking-wide text-slate-300">대외비</p>
        <h1 className="mt-1 text-lg font-semibold leading-snug">
          Jinwww 매각 프로젝트
        </h1>
        <p className="mt-1 text-xs text-slate-400">진웅산업 전용 MVP</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {JINWOONG_NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/15 font-medium text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3 text-xs text-slate-400">
        <Link href="/dashboard" className="block hover:text-white">
          ← TargetBridge 대시보드
        </Link>
        <button
          type="button"
          className="mt-2 text-left text-xs text-slate-400 hover:text-white"
          onClick={async () => {
            await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
            window.location.href = withBasePath("/login");
          }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
