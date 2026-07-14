import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function GradeBadge({ grade }: { grade: string }) {
  const tone =
    grade === "S"
      ? "bg-emerald-100 text-emerald-800"
      : grade === "A"
        ? "bg-blue-100 text-blue-800"
        : grade === "B"
          ? "bg-sky-100 text-sky-800"
          : grade === "C"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
        tone,
      )}
    >
      {grade}등급
    </span>
  );
}

export function StatusBadge({ label }: { label: string }) {
  return <Badge variant="outline">{label}</Badge>;
}

export function ConfidentialFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
      본 자료는 진웅산업 매각 검토를 위한 대외비 자료입니다.
    </footer>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">
        1차 MVP 이후 단계에서 구현 예정입니다. 현재는 개요·분석·타깃 리스트·상세를
        우선 제공합니다.
      </p>
    </div>
  );
}

export function InfoGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 whitespace-pre-wrap">
            {item.value || "-"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-[#0b1f3a]">{title}</h2>
      {children}
    </section>
  );
}
