"use client";

import * as React from "react";
import { Building2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cx } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DepartmentNode, EmployeeOption } from "./types";

/* ---------------- Normalisasi tree ---------------- */

function flatten(nodes: DepartmentNode[], depth = 0): Array<{ node: DepartmentNode; depth: number }> {
  const out: Array<{ node: DepartmentNode; depth: number }> = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children?.length) out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

function buildFromFlat(flat: DepartmentNode[]): DepartmentNode[] {
  const map = new Map<string, DepartmentNode>();
  for (const d of flat) map.set(d.id, { ...d, children: [] });
  const roots: DepartmentNode[] = [];
  for (const d of Array.from(map.values())) {
    const parent = d.parent_id ? map.get(d.parent_id) : undefined;
    if (parent && parent.id !== d.id) parent.children!.push(d);
    else roots.push(d);
  }
  return roots;
}

function asList<T>(res: T[] | { items?: T[] } | null): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.items ?? [];
}

/* ---------------- Dialog tambah/ubah ---------------- */

function DepartmentDialog({
  open,
  onClose,
  initial,
  all,
  employees,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: DepartmentNode | null;
  all: DepartmentNode[];
  employees: EmployeeOption[];
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [headId, setHeadId] = React.useState("");
  const [costCenter, setCostCenter] = React.useState("");
  const [errors, setErrors] = React.useState<{ name?: string; code?: string }>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const flatAll = React.useMemo(() => flatten(all).map((f) => f.node), [all]);
  // Cegah memilih diri sendiri / keturunannya sebagai induk.
  const descendants = React.useMemo(() => {
    if (!initial) return new Set<string>();
    const acc = new Set<string>([initial.id]);
    const walk = (n: DepartmentNode) => {
      for (const c of n.children ?? []) {
        acc.add(c.id);
        walk(c);
      }
    };
    const self = flatAll.find((d) => d.id === initial.id);
    if (self) walk(self);
    return acc;
  }, [initial, flatAll]);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCode(initial?.code ?? "");
    setParentId(initial?.parent_id ?? "");
    setHeadId(initial?.head_id ?? "");
    setCostCenter(initial?.cost_center ?? "");
    setErrors({});
    setSubmitError(null);
    setSaving(false);
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { name?: string; code?: string } = {};
    if (!name.trim()) errs.name = "Nama departemen wajib diisi";
    if (!code.trim()) errs.code = "Kode departemen wajib diisi";
    setErrors(errs);
    if (errs.name || errs.code) {
      document.getElementById(errs.name ? "dept-name" : "dept-code")?.focus();
      return;
    }
    setSaving(true);
    setSubmitError(null);
    const payload = {
      name: name.trim(),
      code: code.trim(),
      parent_id: parentId || null,
      head_id: headId || null,
      cost_center: costCenter.trim() || null,
    };
    try {
      if (initial) await api.put(`/departments/${initial.id}`, payload);
      else await api.post("/departments", payload);
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Gagal menyimpan departemen. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Ubah departemen" : "Tambah departemen"}
      description="Atur nama, kode, dan posisi departemen dalam struktur organisasi."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitError && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
            {submitError}
          </p>
        )}
        <div>
          <Label htmlFor="dept-name" className="mb-1.5">
            Nama departemen <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Input
            id="dept-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={!!errors.name}
            aria-describedby={errors.name ? "dept-name-error" : undefined}
            placeholder="cth. Teknologi Informasi"
          />
          {errors.name && (
            <p id="dept-name-error" role="alert" className="mt-1 text-xs text-danger-text">{errors.name}</p>
          )}
        </div>
        <div>
          <Label htmlFor="dept-code" className="mb-1.5">
            Kode <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Input
            id="dept-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            invalid={!!errors.code}
            aria-describedby={errors.code ? "dept-code-error" : undefined}
            placeholder="cth. TI"
            maxLength={10}
          />
          {errors.code && (
            <p id="dept-code-error" role="alert" className="mt-1 text-xs text-danger-text">{errors.code}</p>
          )}
        </div>
        <div>
          <Label htmlFor="dept-parent" className="mb-1.5">Departemen induk</Label>
          <Select id="dept-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Tidak ada (level teratas)</option>
            {flatAll
              .filter((d) => !descendants.has(d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dept-head" className="mb-1.5">Kepala departemen</Label>
          <Select id="dept-head" value={headId} onChange={(e) => setHeadId(e.target.value)}>
            <option value="">Belum ditentukan</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dept-cost" className="mb-1.5">Cost center</Label>
          <Input
            id="dept-cost"
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            placeholder="cth. CC-100"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? "Simpan perubahan" : "Simpan departemen"}
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
  target: DepartmentNode | null;
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
      await api.del(`/departments/${target.id}`);
      onDeleted();
      onClose();
    } catch (err) {
      // Pesan backend ditampilkan apa adanya (mis. masih ada karyawan aktif).
      setError(err instanceof ApiError ? err.message : "Gagal menghapus departemen. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title="Hapus departemen"
      description={`Departemen "${target?.name ?? ""}" akan dihapus dari struktur organisasi.`}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
          {error}
        </p>
      )}
      {!error && (
        <p className="text-sm text-text-secondary">
          Tindakan ini tidak dapat dibatalkan. Departemen yang masih memiliki karyawan aktif tidak dapat dihapus.
        </p>
      )}
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={deleting}>
          Batal
        </Button>
        <Button variant="destructive" onClick={handleDelete} loading={deleting}>
          Hapus departemen
        </Button>
      </div>
    </Dialog>
  );
}

/* ---------------- Manajer utama ---------------- */

export function DepartmentManager() {
  type TreeResponse = DepartmentNode[] | { items?: DepartmentNode[] } | { tree?: DepartmentNode[] };
  const { data, error, loading, reload } = useApi<TreeResponse>(() =>
    api
      .get<DepartmentNode[] | { tree?: DepartmentNode[] }>("/departments/tree")
      .catch((): Promise<TreeResponse> => api.get<DepartmentNode[] | { items?: DepartmentNode[] }>("/departments")),
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentNode | null>(null);
  const [deleting, setDeleting] = React.useState<DepartmentNode | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);

  React.useEffect(() => {
    void api
      .get<{ items?: EmployeeOption[] } | EmployeeOption[]>("/employees", { query: { per_page: 100 } })
      .then((r) => setEmployees(asList(r)))
      .catch(() => setEmployees([]));
  }, []);

  const tree: DepartmentNode[] = React.useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) {
      const hasChildren = data.some((d) => d.children && d.children.length > 0);
      return hasChildren ? data : buildFromFlat(data);
    }
    if ("tree" in data && data.tree) return data.tree;
    const obj = data as { items?: DepartmentNode[]; tree?: DepartmentNode[] };
    return buildFromFlat(asList<DepartmentNode>(obj.items ?? null));
  }, [data]);

  const flat = React.useMemo(() => flatten(tree), [tree]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          <span className="tnum font-medium text-text">{flat.length}</span> departemen
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah departemen
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2" role="status" aria-label="Memuat departemen">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} shape="text" className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">Gagal memuat departemen</p>
          <p className="max-w-sm text-[13px] text-text-secondary">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Muat ulang
          </Button>
        </div>
      ) : flat.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Building2 className="h-6 w-6" aria-hidden />}
            title="Belum ada departemen"
            description="Buat departemen pertama untuk menyusun struktur organisasi."
            actionLabel="Tambah departemen"
            onAction={openCreate}
          />
        </Card>
      ) : (
        <Card className="p-2">
          <ul aria-label="Daftar departemen">
            {flat.map(({ node, depth }) => (
              <li
                key={node.id}
                className={cx(
                  "group flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-muted/60",
                  depth > 0 && "border-l-2 border-border",
                )}
                style={{ marginLeft: depth * 20 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{node.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
                    {node.code && <Badge variant="neutral">{node.code}</Badge>}
                    {node.head_name && <span>Kepala: {node.head_name}</span>}
                    {node.cost_center && <span className="tnum">Cost center: {node.cost_center}</span>}
                    {node.employee_count !== null && node.employee_count !== undefined && (
                      <span className="tnum">{node.employee_count} karyawan</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ubah ${node.name}`}
                    onClick={() => {
                      setEditing(node);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${node.name}`}
                    onClick={() => setDeleting(node)}
                    className="hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DepartmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        all={tree}
        employees={employees}
        onSaved={reload}
      />
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} onDeleted={reload} />
    </div>
  );
}

export function DeleteHint() {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-text-tertiary">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      Departemen yang masih memiliki karyawan aktif tidak dapat dihapus.
    </p>
  );
}
