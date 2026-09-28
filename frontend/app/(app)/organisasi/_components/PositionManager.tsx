"use client";

import * as React from "react";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import type { DepartmentNode, PositionItem } from "./types";

function asList<T>(res: T[] | { items?: T[] } | null): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.items ?? [];
}

function salaryRange(p: PositionItem): string {
  const min = p.min_salary;
  const max = p.max_salary;
  if (min !== null && min !== undefined && max !== null && max !== undefined)
    return `${formatRupiah(min)} – ${formatRupiah(max)}`;
  if (min !== null && min !== undefined) return `Mulai ${formatRupiah(min)}`;
  if (max !== null && max !== undefined) return `Hingga ${formatRupiah(max)}`;
  return "—";
}

/* ---------------- Dialog tambah/ubah ---------------- */

function PositionDialog({
  open,
  onClose,
  initial,
  departments,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: PositionItem | null;
  departments: DepartmentNode[];
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [minSalary, setMinSalary] = React.useState("");
  const [maxSalary, setMaxSalary] = React.useState("");
  const [errors, setErrors] = React.useState<{ title?: string; code?: string; salary?: string }>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setCode(initial?.code ?? "");
    setLevel(initial?.level ?? "");
    setGrade(initial?.grade ?? "");
    setDepartmentId(initial?.department_id ?? "");
    setMinSalary(initial?.min_salary !== null && initial?.min_salary !== undefined ? String(initial.min_salary) : "");
    setMaxSalary(initial?.max_salary !== null && initial?.max_salary !== undefined ? String(initial.max_salary) : "");
    setErrors({});
    setSubmitError(null);
    setSaving(false);
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { title?: string; code?: string; salary?: string } = {};
    if (!title.trim()) errs.title = "Nama jabatan wajib diisi";
    if (!code.trim()) errs.code = "Kode jabatan wajib diisi";
    const min = minSalary.trim() ? Number(minSalary.replace(/[^0-9]/g, "")) : null;
    const max = maxSalary.trim() ? Number(maxSalary.replace(/[^0-9]/g, "")) : null;
    if (min !== null && max !== null && max < min)
      errs.salary = "Gaji maksimum tidak boleh lebih kecil dari gaji minimum";
    setErrors(errs);
    if (errs.title || errs.code || errs.salary) {
      document.getElementById(errs.title ? "pos-title" : errs.code ? "pos-code" : "pos-min")?.focus();
      return;
    }
    setSaving(true);
    setSubmitError(null);
    const payload = {
      title: title.trim(),
      code: code.trim(),
      level: level.trim() || null,
      grade: grade.trim() || null,
      department_id: departmentId || null,
      min_salary: min,
      max_salary: max,
    };
    try {
      if (initial) await api.put(`/positions/${initial.id}`, payload);
      else await api.post("/positions", payload);
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Gagal menyimpan jabatan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Ubah jabatan" : "Tambah jabatan"}
      description="Atur nama, kode, level, dan rentang gaji jabatan."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitError && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
            {submitError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="pos-title" className="mb-1.5">
              Nama jabatan <span className="text-danger" aria-hidden>*</span>
            </Label>
            <Input
              id="pos-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              invalid={!!errors.title}
              placeholder="cth. Staf Keuangan"
            />
            {errors.title && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="pos-code" className="mb-1.5">
              Kode <span className="text-danger" aria-hidden>*</span>
            </Label>
            <Input
              id="pos-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              invalid={!!errors.code}
              placeholder="cth. STF-KEU"
              maxLength={20}
            />
            {errors.code && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.code}</p>}
          </div>
          <div>
            <Label htmlFor="pos-dept" className="mb-1.5">Departemen</Label>
            <Select id="pos-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Tidak terikat departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="pos-level" className="mb-1.5">Level</Label>
            <Input id="pos-level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="cth. 3" />
          </div>
          <div>
            <Label htmlFor="pos-grade" className="mb-1.5">Grade</Label>
            <Input id="pos-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="cth. III/a" />
          </div>
          <div>
            <Label htmlFor="pos-min" className="mb-1.5">Gaji minimum</Label>
            <Input
              id="pos-min"
              inputMode="numeric"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value.replace(/[^0-9]/g, ""))}
              invalid={!!errors.salary}
              placeholder="5000000"
            />
          </div>
          <div>
            <Label htmlFor="pos-max" className="mb-1.5">Gaji maksimum</Label>
            <Input
              id="pos-max"
              inputMode="numeric"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value.replace(/[^0-9]/g, ""))}
              invalid={!!errors.salary}
              placeholder="8000000"
            />
          </div>
        </div>
        {errors.salary && <p role="alert" className="text-xs text-danger-text">{errors.salary}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? "Simpan perubahan" : "Simpan jabatan"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Dialog hapus ---------------- */

function DeleteDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: PositionItem | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!target) {
      setError(null);
      setDeleting(false);
    }
  }, [target]);

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/positions/${target.id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus jabatan. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title="Hapus jabatan"
      description={`Jabatan "${target?.title ?? ""}" akan dihapus.`}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={deleting}>
          Batal
        </Button>
        <Button variant="destructive" onClick={handleDelete} loading={deleting}>
          Hapus jabatan
        </Button>
      </div>
    </Dialog>
  );
}

/* ---------------- Manajer utama ---------------- */

export function PositionManager() {
  const { data, error, loading, reload } = useApi<{ items?: PositionItem[] } | PositionItem[]>(
    () => api.get("/positions", { query: { per_page: 100 } }),
  );
  const [departments, setDepartments] = React.useState<DepartmentNode[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PositionItem | null>(null);
  const [deleting, setDeleting] = React.useState<PositionItem | null>(null);

  React.useEffect(() => {
    void api
      .get<DepartmentNode[] | { items?: DepartmentNode[] }>("/departments")
      .then((r) => setDepartments(asList(r)))
      .catch(() => setDepartments([]));
  }, []);

  const items = asList(data);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          <span className="tnum font-medium text-text">{items.length}</span> jabatan
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah jabatan
        </Button>
      </div>

      {loading ? (
        <Card className="p-0">
          <div className="space-y-2 p-5" role="status" aria-label="Memuat jabatan">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        </Card>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Gagal memuat jabatan</p>
          <p className="max-w-sm text-[13px] text-text-secondary">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Muat ulang
          </Button>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Briefcase className="h-6 w-6" aria-hidden />}
            title="Belum ada jabatan"
            description="Buat jabatan pertama beserta rentang gajinya."
            actionLabel="Tambah jabatan"
            onAction={openCreate}
          />
        </Card>
      ) : (
        <Card className="p-0">
          <TableWrapper>
            <Table aria-label="Daftar jabatan">
              <TableHeader>
                <TableRow>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead numeric>Rentang gaji</TableHead>
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-text-secondary">{p.code ?? "—"}</TableCell>
                    <TableCell className="tnum">{p.level ?? "—"}</TableCell>
                    <TableCell>{p.grade ?? "—"}</TableCell>
                    <TableCell>{p.department?.name ?? "—"}</TableCell>
                    <TableCell numeric className="tnum whitespace-nowrap">
                      {salaryRange(p)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ubah ${p.title}`}
                          onClick={() => {
                            setEditing(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${p.title}`}
                          onClick={() => setDeleting(p)}
                          className="hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </Card>
      )}

      <PositionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        departments={departments}
        onSaved={reload}
      />
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} onDeleted={reload} />
    </div>
  );
}
