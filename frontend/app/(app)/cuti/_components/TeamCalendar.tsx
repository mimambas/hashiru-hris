"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cx } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ErrorBlock, leaveTypeLabel, toISODate } from "./helpers";
import type { LeaveRequest } from "./types";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function asList(res: unknown): LeaveRequest[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as LeaveRequest[];
  return ((res as { items?: LeaveRequest[] }).items ?? []);
}

/** Petakan tanggal ISO → daftar pengajuan yang mencakup tanggal itu. */
function buildDayMap(items: LeaveRequest[]): Map<string, LeaveRequest[]> {
  const map = new Map<string, LeaveRequest[]>();
  for (const r of items) {
    const start = r.start_date.slice(0, 10);
    const end = r.end_date.slice(0, 10);
    const cur = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    let guard = 0;
    while (cur <= last && guard < 62) {
      const iso = toISODate(cur);
      const arr = map.get(iso) ?? [];
      arr.push(r);
      map.set(iso, arr);
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
  }
  return map;
}

const TYPE_DOT: Record<string, string> = {
  AL: "bg-success",
  SL: "bg-danger",
  UL: "bg-text-tertiary",
};

export function TeamCalendar() {
  const now = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());

  const monthStart = React.useMemo(() => toISODate(new Date(year, month, 1)), [year, month]);
  const monthEnd = React.useMemo(() => toISODate(new Date(year, month + 1, 0)), [year, month]);

  const { data, error, loading, reload } = useApi<unknown>(
    () =>
      api.get("/leave-requests", {
        query: { status: "approved", from: monthStart, to: monthEnd, per_page: 200 },
      }),
    [monthStart, monthEnd],
  );

  const dayMap = React.useMemo(() => {
    const approved = asList(data).filter((r) => r.status === "approved");
    return buildDayMap(approved);
  }, [data]);

  // Sel kalender: hari dari bulan lalu/ini/depan agar grid 6x7 penuh.
  const cells = React.useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay(); // 0 = Minggu
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const todayIso = toISODate(now);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => shift(-1)} aria-label="Bulan sebelumnya">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth());
            }}
          >
            Hari ini
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => shift(1)} aria-label="Bulan berikutnya">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1.5" role="status" aria-label="Memuat kalender">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} shape="block" className="h-16" />
          ))}
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Kalender cuti ${MONTHS[month]} ${year}`}>
            {DAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-medium text-text-tertiary">
                {d}
              </div>
            ))}
            {cells.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === month;
              const entries = dayMap.get(iso) ?? [];
              const isToday = iso === todayIso;
              return (
                <div
                  key={iso}
                  role="gridcell"
                  aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}${entries.length ? `, ${entries.length} cuti` : ""}`}
                  className={cx(
                    "min-h-16 rounded-control border p-1.5",
                    inMonth ? "border-border bg-surface" : "border-transparent bg-muted/40",
                    isToday && "border-accent",
                  )}
                >
                  <span
                    className={cx(
                      "tnum text-xs font-medium",
                      inMonth ? "text-text" : "text-text-tertiary",
                      isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {entries.slice(0, 3).map((r) => {
                      const code = r.leave_type.toUpperCase();
                      const dot = TYPE_DOT[code] ?? "bg-info";
                      const label = `${r.employee?.full_name ?? "Karyawan"} · ${leaveTypeLabel(code)}`;
                      return (
                        <Tooltip key={r.id} content={label}>
                          <span className="flex w-full items-center gap-1 truncate text-left text-[11px] text-text-secondary">
                            <span aria-hidden className={cx("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                            <span className="truncate">{r.employee?.full_name ?? "—"}</span>
                          </span>
                        </Tooltip>
                      );
                    })}
                    {entries.length > 3 && (
                      <span className="tnum block text-[10px] text-text-tertiary">
                        +{entries.length - 3} lainnya
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {dayMap.size === 0 && (
            <div className="mt-2">
              <EmptyState
                icon={<CalendarDays className="h-6 w-6" aria-hidden />}
                title="Tidak ada cuti bulan ini"
                description="Cuti yang disetujui akan tampil di kalender tim."
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
