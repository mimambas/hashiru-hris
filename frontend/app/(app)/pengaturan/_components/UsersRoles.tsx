"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cx } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
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
import { EmptyState } from "@/components/ui/EmptyState";

/* ---------------- Peran ---------------- */

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  hr_director: "Direktur HR",
  hr_manager: "Manajer HR",
  hr_officer: "Staf HR",
  recruiter: "Rekruter",
  finance_officer: "Staf keuangan",
  dept_manager: "Manajer departemen",
  team_leader: "Ketua tim",
  employee: "Karyawan",
};

const EDITABLE_ROLES = Object.keys(ROLE_LABEL);

interface ApiUser {
  id: string;
  email?: string;
  role?: string;
  status?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

function normalizeUsers(raw: unknown): ApiUser[] {
  if (Array.isArray(raw)) return raw as ApiUser[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.items)) return r.items as ApiUser[];
    if (Array.isArray(r.data)) return r.data as ApiUser[];
    if (Array.isArray(r.users)) return r.users as ApiUser[];
  }
  return [];
}

function userStatus(u: ApiUser): { label: string; variant: "success" | "neutral" } {
  if (typeof u.status === "string") {
    const s = u.status.toLowerCase();
    if (s === "active" || s === "aktif") return { label: "Aktif", variant: "success" };
    return { label: u.status, variant: "neutral" };
  }
  if (typeof u.is_active === "boolean") {
    return u.is_active ? { label: "Aktif", variant: "success" } : { label: "Nonaktif", variant: "neutral" };
  }
  return { label: "Aktif", variant: "success" };
}

/* ---------------- Matriks peran × izin (read-only) ---------------- */

const MATRIX_MODULES = [
  "Karyawan",
  "Absensi",
  "Cuti",
  "Penggajian",
  "Pengeluaran",
  "Rekrutmen",
  "Dokumen",
  "Laporan",
  "Pengaturan",
];

const MATRIX: { role: string; cells: string[] }[] = [
  { role: "super_admin", cells: ["Kelola", "Kelola", "Kelola", "Kelola", "Kelola", "Kelola", "Kelola", "Kelola", "Kelola"] },
  { role: "hr_director", cells: ["Kelola", "Kelola", "Setujui*", "Kelola", "Setujui*", "Kelola", "Kelola", "Kelola", "Kelola"] },
  { role: "hr_manager", cells: ["Kelola", "Kelola", "Kelola", "Kelola", "Lihat", "—", "Kelola", "Kelola", "Kelola"] },
  { role: "hr_officer", cells: ["Kelola", "Kelola", "Kelola", "Kelola", "Lihat", "—", "Kelola", "Lihat", "—"] },
  { role: "recruiter", cells: ["Lihat", "—", "—", "—", "—", "Kelola", "Lihat", "—", "—"] },
  { role: "finance_officer", cells: ["Lihat", "—", "—", "Lihat", "Setujui", "—", "—", "Lihat", "—"] },
  { role: "dept_manager", cells: ["Tim", "Tim", "Setujui", "—", "Setujui", "—", "—", "—", "—"] },
  { role: "team_leader", cells: ["Tim", "—", "Setujui", "—", "—", "—", "—", "—", "—"] },
  { role: "employee", cells: ["Sendiri", "Sendiri", "Sendiri", "Slip", "Sendiri", "—", "Sendiri", "—", "—"] },
];

function cellTone(cell: string): string {
  if (cell === "Kelola") return "font-semibold text-text";
  if (cell === "—") return "text-text-tertiary";
  return "text-text-secondary";
}

/* ---------------- Komponen utama ---------------- */

export function UsersRoles() {
  const { data, error, loading, reload } = useApi(() => api.get<unknown>("/users"));
  const users = React.useMemo(() => normalizeUsers(data), [data]);

  const [editing, setEditing] = React.useState<ApiUser | null>(null);
  const [newRole, setNewRole] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  function openEdit(u: ApiUser) {
    setEditing(u);
    setNewRole(typeof u.role === "string" ? u.role : "employee");
    setDialogError(null);
  }

  async function saveRole() {
    if (!editing) return;
    setSaving(true);
    setDialogError(null);
    try {
      await api.put(`/users/${editing.id}`, { role: newRole });
      setEditing(null);
      await reload();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Gagal mengubah peran. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Daftar pengguna */}
      <Card>
        <CardHeader>
          <CardTitle>Pengguna</CardTitle>
          <CardDescription>
            Akun pengguna beserta peran dan statusnya. Ubah peran sesuai tanggung jawab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div aria-label="Memuat pengguna">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="mt-2 h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="flex flex-col items-start gap-2 py-2">
              <p className="flex items-center gap-2 text-sm font-medium text-text">
                <ShieldAlert className="h-4 w-4 text-text-tertiary" aria-hidden />
                Daftar pengguna tidak tersedia
              </p>
              <p className="text-[13px] text-text-secondary">
                {error} Kelola peran tetap bisa dipantau lewat matriks izin di bawah.
              </p>
              <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
                Muat ulang
              </Button>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="Belum ada pengguna"
              description="Pengguna akan tampil di sini setelah ditambahkan."
            />
          ) : (
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const st = userStatus(u);
                    return (
                      <TableRow key={String(u.id)}>
                        <TableCell className="font-medium">
                          {typeof u.email === "string" ? u.email : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">
                            {ROLE_LABEL[String(u.role)] ?? String(u.role ?? "—")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            Ubah peran
                          </Button>
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

      {/* Matriks peran × izin */}
      <Card>
        <CardHeader>
          <CardTitle>Matriks peran dan izin</CardTitle>
          <CardDescription>
            Ringkasan akses tiap peran terhadap modul. Read-only, mengikuti aturan otorisasi backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peran</TableHead>
                  {MATRIX_MODULES.map((m) => (
                    <TableHead key={m}>{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MATRIX.map((row) => (
                  <TableRow key={row.role}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {ROLE_LABEL[row.role] ?? row.role}
                    </TableCell>
                    {row.cells.map((cell, i) => (
                      <TableCell key={i} className={cx("whitespace-nowrap text-[13px]", cellTone(cell))}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
          <div className="mt-4 flex flex-col gap-1 text-xs text-text-tertiary">
            <p>Kelola: buat, ubah, dan hapus data. Setujui: memberikan persetujuan. Lihat: baca saja.</p>
            <p>Tim: data tim yang dipimpin. Sendiri/Slip: data milik sendiri. * Direktur HR menyetujui cuti di atas 3 hari kerja dan pengeluaran di atas Rp 5.000.000.</p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog ubah peran */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Ubah peran pengguna"
        description={editing?.email ? `Atur peran untuk ${editing.email}.` : undefined}
      >
        <div>
          <Label htmlFor="user-role">Peran</Label>
          <Select
            id="user-role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="mt-1.5"
          >
            {EDITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
        {dialogError && (
          <p role="alert" className="mt-3 text-[13px] text-danger-text">
            {dialogError}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>
            Batal
          </Button>
          <Button onClick={() => void saveRole()} loading={saving}>
            Simpan peran
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
