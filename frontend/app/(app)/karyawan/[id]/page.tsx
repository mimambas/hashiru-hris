"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmployeeFormDialog } from "../_components/EmployeeFormDialog";
import {
  AttendanceHistoryTab,
  DokumenTab,
  HistoryTimeline,
  KepegawaianTab,
  LeaveHistoryTab,
  ProfilTab,
  SalaryHistoryTab,
} from "../_components/DetailSections";
import { EmployeeStatusBadge, ErrorBlock, HR_ROLES } from "../_components/helpers";
import type { EmployeeDetail, HistoryEntry } from "../_components/types";

const TABS = [
  { value: "profil", label: "Profil" },
  { value: "kepegawaian", label: "Kepegawaian" },
  { value: "dokumen", label: "Dokumen" },
  { value: "absensi", label: "Riwayat absensi" },
  { value: "cuti", label: "Riwayat cuti" },
  { value: "gaji", label: "Riwayat gaji" },
];

export default function KaryawanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const id = params.id;

  const isHr = hasRole(...HR_ROLES);
  const isEmployee = user?.role === "employee";
  const ownId = user?.employee?.id ?? null;
  // ESS: karyawan hanya boleh melihat profilnya sendiri.
  const isOwnProfile = isEmployee && ownId !== null && ownId === id;
  const canView = isHr || isOwnProfile;
  // Field sensitif disembunyikan untuk ESS.
  const limited = !isHr;

  const [tab, setTab] = React.useState("profil");
  const [editOpen, setEditOpen] = React.useState(false);

  const {
    data: employee,
    error,
    loading,
    reload,
  } = useApi<EmployeeDetail>(() => api.get<EmployeeDetail>(`/employees/${id}`), [id]);

  const { data: historyData, loading: historyLoading } = useApi<HistoryEntry[] | { items?: HistoryEntry[] }>(
    () => api.get(`/employees/${id}/history`),
    [id],
  );
  const history: HistoryEntry[] = Array.isArray(historyData)
    ? historyData
    : (historyData?.items ?? []);

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Detail karyawan"
          description="Profil dan riwayat karyawan."
          actions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Kembali
            </Button>
          }
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-text">Anda tidak memiliki akses</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-text-secondary">
              {isEmployee
                ? "Sebagai karyawan, Anda hanya dapat melihat profil Anda sendiri."
                : "Halaman ini hanya dapat diakses oleh tim HR."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Button>
        {loading ? (
          <DetailSkeleton />
        ) : error || !employee ? (
          <ErrorBlock message={error ?? "Data karyawan tidak ditemukan."} onRetry={reload} />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar name={employee.full_name} src={employee.photo_url} size="lg" />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-text">
                    {employee.full_name}
                  </h1>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {employee.position?.title ?? "—"}
                    {employee.department?.name ? ` · ${employee.department.name}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="tnum text-xs text-text-tertiary">{employee.employee_id}</span>
                    <EmployeeStatusBadge status={employee.status} />
                  </div>
                </div>
              </div>
              {isHr && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Ubah
                </Button>
              )}
            </div>

            <div className="mt-6">
              <Tabs tabs={TABS} value={tab} onChange={setTab} label="Detail karyawan">
                {(value) => (
                  <>
                    {value === "profil" && <ProfilTab employee={employee} limited={limited} />}
                    {value === "kepegawaian" && (
                      <KepegawaianTab employee={employee} limited={limited} />
                    )}
                    {value === "dokumen" && (
                      <DokumenTab employeeId={id} canUpload={isHr} />
                    )}
                    {value === "absensi" && <AttendanceHistoryTab employeeId={id} />}
                    {value === "cuti" && <LeaveHistoryTab employeeId={id} />}
                    {value === "gaji" && !limited && (
                      <SalaryHistoryTab employee={employee} history={history} />
                    )}
                    {value === "gaji" && limited && (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <p className="text-sm font-medium text-text">
                            Informasi gaji hanya dapat dilihat tim HR
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </Tabs>
            </div>

            {isHr && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Linimasa perubahan</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="space-y-2" role="status" aria-label="Memuat linimasa">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} shape="text" className="w-full" />
                      ))}
                    </div>
                  ) : (
                    <HistoryTimeline entries={history} />
                  )}
                </CardContent>
              </Card>
            )}

            <p className="mt-3 text-xs text-text-tertiary">
              Bergabung {formatDate(employee.join_date)}
              {employee.employment_status ? ` · Status ${employee.employment_status}` : ""}
            </p>

            {isHr && (
              <EmployeeFormDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                mode="edit"
                initial={employee}
                onSaved={reload}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Memuat detail karyawan">
      <div className="flex items-center gap-4">
        <Skeleton shape="circle" className="h-14 w-14" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="text" className="h-6 w-56" />
          <Skeleton shape="text" className="w-40" />
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="w-2/3" />
      </div>
    </div>
  );
}
