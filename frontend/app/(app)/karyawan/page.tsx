"use client";

import * as React from "react";
import Link from "next/link";
import { FileUp, Pencil, Plus, Search, UserRound, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { EmployeeFormDialog } from "./_components/EmployeeFormDialog";
import { ImportDialog } from "./_components/ImportDialog";
import { EmployeeStatusBadge, ErrorBlock, HR_ROLES } from "./_components/helpers";
import type { Department, EmployeeListItem, Paged } from "./_components/types";

const PER_PAGE = 20;

const STATUS_FILTERS = [
  { value: "", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "probation", label: "Masa percobaan" },
  { value: "inactive", label: "Nonaktif" },
];

function useDebounced(value: string, delay = 400): string {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function KaryawanPage() {
  const { hasRole } = useAuth();
  const isHr = hasRole(...HR_ROLES);

  const [query, setQuery] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const debouncedQuery = useDebounced(query);

  // Reset ke halaman 1 setiap filter berubah.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, departmentId, status]);

  React.useEffect(() => {
    void api
      .get<Department[] | { items?: Department[] }>("/departments")
      .then((r) => setDepartments(Array.isArray(r) ? r : (r.items ?? [])))
      .catch(() => setDepartments([]));
  }, []);

  const { data, error, loading, reload } = useApi<Paged<EmployeeListItem>>(
    () =>
      api.get<Paged<EmployeeListItem>>("/employees", {
        query: {
          q: debouncedQuery || undefined,
          department_id: departmentId || undefined,
          status: status || undefined,
          page,
          per_page: PER_PAGE,
        },
      }),
    [debouncedQuery, departmentId, status, page],
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const hasFilter = debouncedQuery || departmentId || status;

  function clearFilters() {
    setQuery("");
    setDepartmentId("");
    setStatus("");
  }

  return (
    <div>
      <PageHeader
        title="Karyawan"
        description="Kelola data seluruh karyawan perusahaan."
        actions={
          isHr ? (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileUp className="h-4 w-4" aria-hidden />
                Impor
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Tambah karyawan
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <Input
            type="search"
            aria-label="Cari karyawan"
            placeholder="Cari nama, ID, atau email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-text-tertiary hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <Select
          aria-label="Filter departemen"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="sm:w-52"
        >
          <option value="">Semua departemen</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="sm:w-44"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Bersihkan filter
          </Button>
        )}
      </div>

      {/* Konten */}
      {loading ? (
        <Card className="p-0">
          <div className="space-y-3 p-5" aria-label="Memuat daftar karyawan" role="status">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton shape="circle" className="h-10 w-10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton shape="text" className="w-1/3" />
                  <Skeleton shape="text" className="w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden />}
            title={hasFilter ? "Tidak ada karyawan yang cocok" : "Belum ada data karyawan"}
            description={
              hasFilter
                ? "Coba ubah kata kunci atau bersihkan filter."
                : "Tambahkan karyawan pertama atau impor dari berkas CSV/XLSX."
            }
            actionLabel={hasFilter ? "Bersihkan filter" : isHr ? "Tambah karyawan" : undefined}
            onAction={hasFilter ? clearFilters : isHr ? () => setFormOpen(true) : undefined}
          />
        </Card>
      ) : (
        <Card className="p-0">
          <TableWrapper>
            <Table aria-label="Daftar karyawan">
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>ID karyawan</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Tanggal bergabung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Link
                        href={`/karyawan/${emp.id}`}
                        className="flex items-center gap-3 rounded-control focus-visible:outline-none"
                      >
                        <Avatar name={emp.full_name} src={emp.photo_url} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-text hover:text-accent">
                            {emp.full_name}
                          </span>
                          <span className="block truncate text-xs text-text-secondary">
                            {emp.email}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="tnum whitespace-nowrap text-text-secondary">
                      {emp.employee_id}
                    </TableCell>
                    <TableCell>{emp.department?.name ?? "—"}</TableCell>
                    <TableCell>{emp.position?.title ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-text-secondary">
                      {formatDate(emp.join_date)}
                    </TableCell>
                    <TableCell>
                      <EmployeeStatusBadge status={emp.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/karyawan/${emp.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text"
                      >
                        <UserRound className="h-4 w-4" aria-hidden />
                        Detail
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-[13px] text-text-secondary">
              Menampilkan{" "}
              <span className="tnum font-medium text-text">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)}
              </span>{" "}
              dari <span className="tnum font-medium text-text">{total}</span> karyawan
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Halaman sebelumnya"
              >
                Sebelumnya
              </Button>
              <span className="tnum px-2 text-[13px] text-text-secondary" aria-live="polite">
                {page} / {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Halaman berikutnya"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </Card>
      )}

      <p className="mt-3 text-xs text-text-tertiary">
        ID karyawan dibuat otomatis dengan format EMP-YYYYMMDD-XXX.
      </p>

      {isHr && (
        <>
          <EmployeeFormDialog
            open={formOpen}
            onClose={() => setFormOpen(false)}
            mode="create"
            onSaved={reload}
          />
          <ImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            onImported={reload}
          />
        </>
      )}
    </div>
  );
}
