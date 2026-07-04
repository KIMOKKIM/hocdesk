import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Mail,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

const features = [
  {
    icon: Building2,
    title: "타깃 업체 관리",
    description:
      "매각 프로젝트별 타깃을 등급화하고 검토·승인 워크플로를 체계적으로 운영합니다.",
  },
  {
    icon: Sparkles,
    title: "AI 타깃 제안",
    description:
      "산업군·재무 프로필 기반으로 신규 타깃을 자동 제안하고 담당자 검토를 지원합니다.",
  },
  {
    icon: Mail,
    title: "이메일 아웃리치",
    description:
      "초안 작성부터 승인, 발송까지 B2B 영업 커뮤니케이션을 한 화면에서 관리합니다.",
  },
  {
    icon: BarChart3,
    title: "업무 대시보드",
    description:
      "검토 대기, 승인 대기, 발송 현황을 실시간으로 파악하는 PC 우선 업무 화면입니다.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </div>
            <span className="text-lg font-semibold">{APP_NAME}</span>
          </div>
          <Button
            nativeButton={false}
            render={
              <Link href="/dashboard">
                대시보드 이동
                <ArrowRight data-icon="inline-end" />
              </Link>
            }
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Shield className="size-4" />
            B2B 기업금융 · M&A 영업 자동화
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            타깃 발굴부터
            <br />
            이메일 아웃리치까지 한 곳에서
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {APP_NAME}는 매각 프로젝트 타깃 관리, AI 기반 신규 제안, 이메일
            초안·승인·발송 워크플로를 통합하는 기업 영업 자동화 플랫폼입니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/dashboard">
                  업무 대시보드 시작
                  <ArrowRight data-icon="inline-end" />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/projects">매각 프로젝트 보기</Link>
              }
            />
          </div>
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/80 shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
