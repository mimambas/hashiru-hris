"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";

export interface AreaPoint {
  label: string;
  value: number;
}

interface AreaChartCardProps {
  title: string;
  description?: string;
  data: AreaPoint[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  valueFormatter?: (value: number) => string;
  /** Formatter khusus label sumbu (default: valueFormatter). */
  axisFormatter?: (value: number) => string;
}

/** Grafik area — mis. tren headcount 12 bulan. */
function AreaChartCard({
  title,
  description,
  data,
  loading,
  error,
  onRetry,
  valueFormatter = (v) => v.toLocaleString("id-ID"),
  axisFormatter,
}: AreaChartCardProps) {
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
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
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
            formatter={(value: unknown) => [valueFormatter(Number(value)), "Jumlah"]}
            labelStyle={{ color: "var(--text-secondary)" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent-soft)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export { AreaChartCard };
