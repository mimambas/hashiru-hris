"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";

interface LeaveType {
  code?: string;
  name?: string;
  days?: number;
  [key: string]: unknown;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  AL: "Cuti tahunan",
  SL: "Cuti sakit",
  PL: "Cuti pribadi",
  ML: "Cuti melahirkan",
  PT: "Cuti ayah",
  BL: "Cuti menikah",
  MR: "Cuti menikahkan anak",
  HJ: "Cuti haji",
  UL: "Cuti tidak dibayar",
  CB: "Cuti bersama",
};

function normalize(raw: unknown): LeaveType[] {
  if (Array.isArray(raw)) return raw as LeaveType[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.items)) return r.items as LeaveType[];
    if (Array.isArray(r.leave_types)) return r.leave_types as LeaveType[];
    if (Array.isArray(r.data)) return r.data as LeaveType[];
  }
  return [];
}

function labelOf(t: LeaveType): string {
  const code = typeof t.code === "string" ? t.code : "";
  if (typeof t.name === "string" && t.name.trim()) return t.name;
  return LEAVE_TYPE_LABEL[code] ?? code;
}

function daysOf(t: LeaveType): number {
  const v = t.days ?? t.total_days ?? t.quota;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function LeaveTypesForm() {
  const { data, error, loading, reload } = useApi(() =>
    api.get<unknown>("/settings/leave-types"),
  );
  const [days, setDays] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const types = React.useMemo(() => normalize(data), [data]);

  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const t of types) {
      const key = String(t.code ?? t.name ?? "");
      next[key] = String(daysOf(t));
    }
    setDays(next);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  function setDay(key: string, value: string) {
    setDays((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const [key, value] of Object.entries(days)) {
      if (!/^\d+$/.test(value.trim())) {
        setFormError(`Jatah untuk "${key}" harus berupa angka hari.`);
        return;
      }
    }
    setSaving(true);
    setFormError(null);
    setSaved(false);
    try {
      const payload = types.map((t) => {
        const key = String(t.code ?? t.name ?? "");
        return { ...t, days: Number(days[key] ?? daysOf(t)) };
      });
      await api.put("/settings/leave-types", { leave_types: payload });
      setSaved(true);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card aria-label="Memuat tipe cuti">
        <CardHeader>
          <Skeleton shape="text" className="w-48" />
          <Skeleton shape="text" className="mt-1 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mt-2 h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <div role="alert" className="flex flex-col items-start gap-2 p-6">
          <p className="text-sm font-medium text-text">Tipe cuti gagal dimuat</p>
          <p className="text-[13px] text-text-secondary">{error ?? "Data tidak tersedia."}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
            Muat ulang
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipe cuti & jatah</CardTitle>
        <CardDescription>
          Atur jumlah hari jatah tahunan untuk setiap tipe cuti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe cuti</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead numeric>Jatah (hari/tahun)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t, i) => {
                  const key = String(t.code ?? t.name ?? i);
                  const code = typeof t.code === "string" ? t.code : "—";
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{labelOf(t)}</TableCell>
                      <TableCell className="text-text-secondary">{code}</TableCell>
                      <TableCell numeric>
                        <div className="inline-flex items-center gap-2">
                          <Label htmlFor={`leave-days-${key}`} className="sr-only">
                            Jatah {labelOf(t)} dalam hari
                          </Label>
                          <Input
                            id={`leave-days-${key}`}
                            type="number"
                            min={0}
                            value={days[key] ?? ""}
                            onChange={(e) => setDay(key, e.target.value)}
                            className="tnum w-24 text-right"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>

          {formError && (
            <p role="alert" className="mt-4 text-[13px] text-danger-text">{formError}</p>
          )}
          {saved && (
            <p role="status" className="mt-4 text-[13px] text-success-text">
              Jatah cuti tersimpan.
            </p>
          )}

          <div className="mt-5">
            <Button type="submit" loading={saving}>
              Simpan perubahan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
