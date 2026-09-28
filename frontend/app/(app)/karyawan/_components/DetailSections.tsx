"use client";

import * as React from "react";
import { Download, FileText, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate, formatRupiah, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import { ErrorBlock, employmentStatusLabel, formatNpwp, genderLabel } from "./helpers";
import type { EmployeeDetail, HistoryEntry } from "./types";

/* ---------------- Util kecil ---------------- */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-44 shrink-0 text-[13px] text-text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-text">{value ?? "—"}</dd>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border/60">{children}</dl>
      </CardContent>
    </Card>
  );
}

/* ---------------- Tab: Profil ---------------- */

export function ProfilTab({ employee, limited }: { employee: EmployeeDetail; limited: boolean }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Data pribadi">
        <InfoRow label="Nama lengkap" value={employee.full_name} />
        <InfoRow label="ID karyawan" value={<span className="tnum">{employee.employee_id}</span>} />
        {!limited && <InfoRow label="NIK" value={<span className="tnum">{employee.nik ?? "—"}</span>} />}
        {!limited && <InfoRow label="NPWP" value={<span className="tnum">{formatNpwp(employee.npwp)}</span>} />}
        <InfoRow
          label="Tempat, tanggal lahir"
          value={
            employee.place_of_birth || employee.date_of_birth
              ? `${employee.place_of_birth ?? ""}${employee.place_of_birth && employee.date_of_birth ? ", " : ""}${formatDate(employee.date_of_birth)}`
              : "—"
          }
        />
        <InfoRow label="Jenis kelamin" value={genderLabel(employee.gender)} />
        <InfoRow label="Golongan darah" value={employee.blood_type ?? "—"} />
        <InfoRow label="Agama" value={employee.religion ?? "—"} />
        <InfoRow label="Status pernikahan" value={employee.marital_status ?? "—"} />
      </SectionCard>

      <SectionCard title="Kontak">
        <InfoRow label="Email" value={employee.email} />
        <InfoRow label="Nomor telepon" value={<span className="tnum">{employee.phone ?? "—"}</span>} />
        <InfoRow label="Alamat KTP" value={employee.address_ktp ?? "—"} />
        <InfoRow label="Alamat domisili" value={employee.address_domisili ?? "—"} />
      </SectionCard>

      <SectionCard title="Kontak darurat">
        <InfoRow label="Nama" value={employee.emergency_contact_name ?? "—"} />
        <InfoRow
          label="Nomor telepon"
          value={<span className="tnum">{employee.emergency_contact_phone ?? "—"}</span>}
        />
        <InfoRow label="Hubungan" value={employee.emergency_contact_relation ?? "—"} />
      </SectionCard>
    </div>
  );
}

/* ---------------- Tab: Kepegawaian ---------------- */

export function KepegawaianTab({ employee, limited }: { employee: EmployeeDetail; limited: boolean }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Penempatan">
        <InfoRow label="Departemen" value={employee.department?.name ?? "—"} />
        <InfoRow label="Jabatan" value={employee.position?.title ?? "—"} />
        <InfoRow label="Cabang" value={employee.branch ?? "—"} />
        <InfoRow label="Atasan langsung" value={employee.reporting_to_name ?? "—"} />
        <InfoRow label="Status kepegawaian" value={employmentStatusLabel(employee.employment_status)} />
        <InfoRow label="Tipe kepegawaian" value={employee.employment_type ?? "—"} />
      </SectionCard>

      <SectionCard title="Masa kerja">
        <InfoRow label="Tanggal bergabung" value={formatDate(employee.join_date)} />
        <InfoRow label="Mulai kontrak" value={formatDate(employee.contract_start)} />
        <InfoRow label="Akhir kontrak" value={formatDate(employee.contract_end)} />
        <InfoRow label="Akhir masa percobaan" value={formatDate(employee.probation_end)} />
      </SectionCard>

      {!limited && (
        <SectionCard title="Rekening & BPJS">
          <InfoRow label="Gaji pokok" value={<span className="tnum">{formatRupiah(employee.base_salary)}</span>} />
          <InfoRow label="Bank" value={employee.bank_name ?? "—"} />
          <InfoRow
            label="Nomor rekening"
            value={<span className="tnum">{employee.bank_account ?? "—"}</span>}
          />
          <InfoRow label="Nama pemilik rekening" value={employee.bank_account_name ?? "—"} />
          <InfoRow label="Status PTKP" value={employee.ptkp_status ?? "—"} />
          <InfoRow
            label="No. BPJS Kesehatan"
            value={<span className="tnum">{employee.bpjs_kesehatan_no ?? "—"}</span>}
          />
          <InfoRow
            label="No. BPJS Ketenagakerjaan"
            value={<span className="tnum">{employee.bpjs_ketenagakerjaan_no ?? "—"}</span>}
          />
        </SectionCard>
      )}
    </div>
  );
}

/* ---------------- Tab: Dokumen ---------------- */

interface DocItem {
  id: string;
  name: string;
  category?: string | null;
  file_url?: string | null;
  verified?: boolean | null;
  created_at?: string | null;
}

const DOC_CATEGORY_LABEL: Record<string, string> = {
  personal: "Pribadi",
  employment: "Kepegawaian",
  company: "Perusahaan",
};

export function DokumenTab({ employeeId, canUpload }: { employeeId: string; canUpload: boolean }) {
  const { data, error, loading, reload } = useApi<DocItem[] | { items?: DocItem[] }>(() =>
    api.get<DocItem[] | { items?: DocItem[] }>("/documents", {
      query: { employee_id: employeeId },
    }),
  );
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const items = Array.isArray(data) ? data : (data?.items ?? []);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Dokumen</CardTitle>
        {canUpload && (
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Unggah dokumen
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Memuat dokumen">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden />}
            title="Belum ada dokumen"
            description="Dokumen karyawan akan tampil di sini."
            actionLabel={canUpload ? "Unggah dokumen" : undefined}
            onAction={canUpload ? () => setUploadOpen(true) : undefined}
          />
        ) : (
          <TableWrapper>
            <Table aria-label="Dokumen karyawan">
              <TableHeader>
                <TableRow>
                  <TableHead>Nama berkas</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Diunggah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      {doc.category ? (DOC_CATEGORY_LABEL[doc.category] ?? doc.category) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-text-secondary">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell>
                      {doc.verified ? (
                        <Badge variant="success">Terverifikasi</Badge>
                      ) : (
                        <Badge variant="neutral">Belum diverifikasi</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text"
                        >
                          <Download className="h-4 w-4" aria-hidden />
                          Unduh
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </CardContent>
      {canUpload && (
        <UploadDocDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          employeeId={employeeId}
          onDone={reload}
        />
      )}
    </Card>
  );
}

function UploadDocDialog({
  open,
  onClose,
  employeeId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onDone: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState("personal");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setCategory("personal");
      setName("");
      setError(null);
      setSaving(false);
    }
  }, [open ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih berkas terlebih dahulu");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran berkas maksimal 10 MB");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("employee_id", employeeId);
      fd.append("category", category);
      fd.append("name", name.trim() || file.name);
      await api.upload("/documents/upload", fd);
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengunggah dokumen. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Unggah dokumen" description="Format PDF, JPG, PNG, atau DOCX, maksimal 10 MB.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
            {error}
          </p>
        )}
        <div>
          <Label htmlFor="doc-file" className="mb-1.5">Berkas</Label>
          <input
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-control border border-border bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text hover:file:bg-border"
          />
        </div>
        <div>
          <Label htmlFor="doc-name" className="mb-1.5">Nama dokumen</Label>
          <Input
            id="doc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={file?.name ?? "cth. KTP"}
          />
        </div>
        <div>
          <Label htmlFor="doc-category" className="mb-1.5">Kategori</Label>
          <Select id="doc-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="personal">Pribadi</option>
            <option value="employment">Kepegawaian</option>
            <option value="company">Perusahaan</option>
          </Select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Unggah
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Tab: Riwayat Absensi ---------------- */

const ATT_STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  present: { label: "Hadir", variant: "success" },
  late: { label: "Terlambat", variant: "warning" },
  early_leave: { label: "Pulang cepat", variant: "warning" },
  absent: { label: "Absen", variant: "danger" },
  wfh: { label: "WFH", variant: "info" },
  leave: { label: "Cuti", variant: "neutral" },
  holiday: { label: "Libur", variant: "neutral" },
};

export function AttendanceHistoryTab({ employeeId }: { employeeId: string }) {
  const from = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  }, []);
  const { data, error, loading, reload } = useApi<{ items?: unknown[] } | unknown[]>(() =>
    api.get("/attendance", { query: { employee_id: employeeId, from, per_page: 50 } }),
  );
  const items = (Array.isArray(data) ? data : (data?.items ?? [])) as Array<Record<string, unknown>>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat absensi</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Memuat riwayat absensi">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat absensi"
            description="Data absensi 90 hari terakhir akan tampil di sini."
          />
        ) : (
          <TableWrapper>
            <Table aria-label="Riwayat absensi">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead>Keluar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead numeric>Telat (mnt)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r, i) => {
                  const st = String(r.status ?? "");
                  const meta = ATT_STATUS_META[st] ?? { label: st || "—", variant: "neutral" as const };
                  return (
                    <TableRow key={String(r.id ?? i)}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(String(r.date ?? r.check_in ?? ""))}
                      </TableCell>
                      <TableCell className="tnum">{formatTime(r.check_in)}</TableCell>
                      <TableCell className="tnum">{formatTime(r.check_out)}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell numeric className="tnum">
                        {r.late_minutes !== null && r.late_minutes !== undefined
                          ? String(r.late_minutes)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ---------------- Tab: Riwayat Cuti ---------------- */

const LEAVE_STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  pending: { label: "Menunggu", variant: "warning" },
  approved: { label: "Disetujui", variant: "success" },
  rejected: { label: "Ditolak", variant: "danger" },
  cancelled: { label: "Dibatalkan", variant: "neutral" },
};

export function LeaveHistoryTab({ employeeId }: { employeeId: string }) {
  const { data, error, loading, reload } = useApi<{ items?: unknown[] } | unknown[]>(() =>
    api.get("/leave-requests", { query: { employee_id: employeeId, per_page: 50 } }),
  );
  const items = (Array.isArray(data) ? data : (data?.items ?? [])) as Array<Record<string, unknown>>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat cuti</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Memuat riwayat cuti">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada pengajuan cuti"
            description="Riwayat pengajuan cuti karyawan akan tampil di sini."
          />
        ) : (
          <TableWrapper>
            <Table aria-label="Riwayat cuti">
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead numeric>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r, i) => {
                  const st = String(r.status ?? "");
                  const meta = LEAVE_STATUS_META[st] ?? { label: st || "—", variant: "neutral" as const };
                  return (
                    <TableRow key={String(r.id ?? i)}>
                      <TableCell className="font-medium">{String(r.leave_type ?? "—")}</TableCell>
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        {formatDate(String(r.start_date ?? ""))} – {formatDate(String(r.end_date ?? ""))}
                      </TableCell>
                      <TableCell numeric className="tnum">
                        {r.total_days !== undefined && r.total_days !== null
                          ? `${r.total_days} hari`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Tab: Riwayat Gaji ---------------- */

export function SalaryHistoryTab({
  employee,
  history,
}: {
  employee: EmployeeDetail;
  history: HistoryEntry[];
}) {
  const salaryChanges = React.useMemo(
    () =>
      history.filter((h) => {
        const blob = JSON.stringify(h).toLowerCase();
        return blob.includes("salary") || blob.includes("gaji");
      }),
    [history],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gaji saat ini</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="tnum text-2xl font-semibold tracking-tight text-text">
            {formatRupiah(employee.base_salary)}
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            Gaji pokok per bulan, sebelum tunjangan dan potongan.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Perubahan gaji</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryChanges.length === 0 ? (
            <EmptyState
              title="Belum ada perubahan tercatat"
              description="Perubahan gaji pokok akan tercatat di sini."
            />
          ) : (
            <HistoryTimeline entries={salaryChanges} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Linimasa perubahan ---------------- */

function stringify(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function HistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Belum ada aktivitas tercatat"
        description="Setiap perubahan data karyawan akan tercatat di sini."
      />
    );
  }
  return (
    <ol className="relative space-y-5 border-l border-border pl-5" aria-label="Linimasa perubahan">
      {entries.map((entry, i) => {
        const actor =
          entry.actor_name ?? entry.created_by ?? "Sistem";
        const time = entry.created_at ? timeAgo(entry.created_at) : "";
        const title =
          entry.description ?? entry.action ?? entry.field
            ? `Perubahan ${stringify(entry.field)}`
            : "Perubahan data";
        return (
          <li key={String(entry.id ?? i)} className="relative">
            <span
              aria-hidden
              className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent"
            />
            <p className="text-sm font-medium text-text">{title}</p>
            {entry.changes && entry.changes.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-[13px] text-text-secondary">
                {entry.changes.map((c, j) => (
                  <li key={j} className="tnum">
                    {stringify(c.field)}: {stringify(c.old_value)} → {stringify(c.new_value)}
                  </li>
                ))}
              </ul>
            ) : entry.old_value !== undefined || entry.new_value !== undefined ? (
              <p className="tnum mt-0.5 text-[13px] text-text-secondary">
                {stringify(entry.old_value)} → {stringify(entry.new_value)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-text-tertiary">
              {actor}
              {time ? ` · ${time}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
