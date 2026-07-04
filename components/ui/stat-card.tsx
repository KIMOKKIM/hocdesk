import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number | string;
  change?: string;
  className?: string;
};

export function StatCard({ label, value, change, className }: StatCardProps) {
  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {change ? (
          <p className="mt-2 text-xs text-muted-foreground">{change}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
