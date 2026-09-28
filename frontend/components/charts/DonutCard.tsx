"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";

export interface DonutSlice {
  name: string;
  value: number;
}

interface DonutCardProps {
  title: string;
  description?: string;
  data: DonutSlice[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  valueFormatter?: (value: number) => string;
}

const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Grafik donat — mis. distribusi karyawan per departemen. */
function DonutCard({
  title,
  description,
  data,
  loading,
  error,
  onRetry,
  valueFormatter = (v) => v.toLocaleString("id-ID"),
}: DonutCardProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={data.length === 0 || total === 0}
    >
      <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative h-48 flex-1 sm:h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
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
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_VARS[i % CHART_VARS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-2xl font-semibold text-text">
              {valueFormatter(total)}
            </span>
            <span className="text-xs text-text-tertiary">Total</span>
          </div>
        </div>
        <ul className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1.5 sm:max-w-44 sm:grid-cols-1">
          {data.slice(0, 6).map((d, i) => (
            <li key={d.name} className="flex items-center gap-2 text-[13px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CHART_VARS[i % CHART_VARS.length] }}
                aria-hidden
              />
              <span className="truncate text-text-secondary" title={d.name}>
                {d.name}
              </span>
              <span className="tnum ml-auto font-medium text-text">
                {valueFormatter(d.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

export { DonutCard };
