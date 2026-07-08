import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type RankingItem = {
  label: string;
  sublabel?: string;
  value: string;
  meta?: string;
  status?: "green" | "amber" | "red";
};

const statusStyle: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  red: "bg-red-500/15 text-red-700 border-red-500/30",
};

export function RankingList({
  title,
  items,
  emptyMessage = "Aucune donnée pour l'instant.",
  limit = 10,
}: {
  title: string;
  items: RankingItem[];
  emptyMessage?: string;
  limit?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, limit).map((row, i) => (
              <div
                key={`${row.label}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.label}</div>
                  {row.sublabel && (
                    <div className="truncate text-xs text-muted-foreground">{row.sublabel}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {row.meta && <span className="text-xs text-muted-foreground">{row.meta}</span>}
                  {row.status ? (
                    <Badge variant="outline" className={statusStyle[row.status]}>
                      {row.value}
                    </Badge>
                  ) : (
                    <span className="text-sm font-semibold">{row.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
