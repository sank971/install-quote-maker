/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
};

export function TimeSeriesChart({
  title,
  data,
  description,
}: {
  title: string;
  description?: string;
  data: { label: string; revenue: number; cost: number; margin: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any) => fmtEur(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="CA"
                stroke="hsl(217 91% 60%)"
                fill="url(#rev)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Coûts"
                stroke="hsl(0 84% 60%)"
                fill="url(#cost)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="margin"
                name="Marge"
                stroke="hsl(142 71% 45%)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function EntityBarChart({
  title,
  data,
  description,
}: {
  title: string;
  description?: string;
  data: { label: string; revenue: number; cost: number; margin: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)}
              />
              <Tooltip {...tooltipStyle} formatter={(v: any) => fmtEur(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="CA" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Coûts" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarginBarChart({
  title,
  data,
  description,
}: {
  title: string;
  description?: string;
  data: { label: string; margin: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 12, left: 40, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)}
              />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={120} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => fmtEur(Number(v))} />
              <Bar dataKey="margin" name="Marge" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.margin >= 0 ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function CostBreakdownChart({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)}
              />
              <Tooltip {...tooltipStyle} formatter={(v: any) => fmtEur(Number(v))} />
              <Bar dataKey="value" name="Coût" fill="hsl(24 95% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
