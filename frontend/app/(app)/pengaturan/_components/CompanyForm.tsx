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
import { Skeleton } from "@/components/ui/Skeleton";

interface CompanySettings {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  [key: string]: unknown;
}

const FIELDS: { key: keyof CompanySettings; label: string; type?: string; placeholder?: string; required?: boolean }[] = [
  { key: "name", label: "Nama perusahaan", placeholder: "PT Hashiru Indonesia", required: true },
  { key: "address", label: "Alamat", placeholder: "Jl. Contoh No. 1, Jakarta" },
  { key: "phone", label: "Telepon", placeholder: "(021) 1234567" },
  { key: "email", label: "Email", type: "email", placeholder: "info@perusahaan.id" },
  { key: "website", label: "Situs web", placeholder: "https://perusahaan.id" },
  { key: "tax_id", label: "NPWP", placeholder: "00.000.000.0-000.000" },
];

export function CompanyForm() {
  const { data, error, loading, reload } = useApi(() =>
    api.get<CompanySettings>("/settings/company"),
  );
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      for (const f of FIELDS) {
        const v = data[f.key];
        next[String(f.key)] = typeof v === "string" ? v : (v != null ? String(v) : "");
      }
      setValues(next);
    }
  }, [data]);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name?.trim()) {
      setFormError("Isi nama perusahaan.");
      return;
    }
    setSaving(true);
    setFormError(null);
    setSaved(false);
    try {
      await api.put("/settings/company", values);
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
      <Card aria-label="Memuat pengaturan perusahaan">
        <CardHeader>
          <Skeleton shape="text" className="w-48" />
          <Skeleton shape="text" className="mt-1 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton shape="text" className="w-28" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <div role="alert" className="flex flex-col items-start gap-2 p-6">
          <p className="text-sm font-medium text-text">Pengaturan perusahaan gagal dimuat</p>
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
        <CardTitle>Profil perusahaan</CardTitle>
        <CardDescription>Informasi dasar perusahaan yang tampil di dokumen resmi.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={String(f.key)} className={f.key === "address" ? "sm:col-span-2" : ""}>
                <Label htmlFor={`company-${String(f.key)}`}>
                  {f.label}
                  {f.required && <span aria-hidden> *</span>}
                </Label>
                <Input
                  id={`company-${String(f.key)}`}
                  type={f.type ?? "text"}
                  value={values[String(f.key)] ?? ""}
                  placeholder={f.placeholder}
                  required={f.required}
                  onChange={(e) => set(String(f.key), e.target.value)}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>

          {formError && (
            <p role="alert" className="mt-4 text-[13px] text-danger-text">
              {formError}
            </p>
          )}
          {saved && (
            <p role="status" className="mt-4 text-[13px] text-success-text">
              Pengaturan perusahaan tersimpan.
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
