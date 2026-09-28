"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";

export interface BarSeries {
  key: string;
  name: string;
}

export type BarRow = { label: string } & Record<string, number | string>;

interface BarCardProps {
  title: string;
  description?: string;
  data: BarRow[];
  series: BarSeries[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Bila true, seri ditumpuk (stacked). */
  stacked?: boolean;
  valueFormatter?: (value: number) => string;
  /** Formatter khusus label sumbu (default: valueFormatter). */
  axisFormatter?: (value: number) => string;
}

const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Grafik batang — tunggal maupun stacked (mis. cuti per tipe). */
function BarCard({
  title,
  description,
  data,
  series,
  loading,
  error,
  onRetry,
  stacked = false,
  valueFormatter = (v) => v.toLocaleString("id-ID"),
  axisFormatter,
}: BarCardProps) {
  const axis = axisFormatter ?? valueFormatter;

  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
            tickFormatter={(label: string) =>
              label.length > 10 ? `${label.slice(0, 9)}…` : label
            }
          />
          <YAxis
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => axis(v)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: 13,
              color: "var(--text)",
            }}
            formatter={(value: unknown, name: unknown) => [
              valueFormatter(Number(value)),
              String(name),
            ]}
            labelStyle={{ color: "var(--text-secondary)" }}
            cursor={{ fill: "var(--bg-muted)", opacity: 0.5 }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId={stacked ? "total" : undefined}
              fill={CHART_VARS[i % CHART_VARS.length]}
              radius={stacked ? 0 : [6, 6, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export { BarCard };
