"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompanyForm } from "./_components/CompanyForm";
import { AttendanceForm } from "./_components/AttendanceForm";
import { LeaveTypesForm } from "./_components/LeaveTypesForm";
import { UsersRoles } from "./_components/UsersRoles";

const TABS = [
  { value: "perusahaan", label: "Perusahaan" },
  { value: "absensi", label: "Absensi" },
  { value: "cuti", label: "Cuti" },
  { value: "pengguna", label: "Pengguna & Peran" },
];

export default function PengaturanPage() {
  const { hasRole } = useAuth();
  const [tab, setTab] = React.useState("perusahaan");

  const allowed = hasRole("super_admin", "hr_director", "hr_manager");

  if (!allowed) {
    return (
      <div>
        <PageHeader
          title="Pengaturan"
          description="Kelola profil perusahaan, aturan absensi, tipe cuti, dan peran pengguna."
        />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" aria-hidden />}
          title="Anda tidak memiliki akses"
          description="Halaman pengaturan hanya tersedia untuk manajer HR ke atas. Hubungi tim HR bila Anda membutuhkan perubahan."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Kelola profil perusahaan, aturan absensi, tipe cuti, dan peran pengguna."
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Bagian pengaturan">
        {(value) => (
          <>
            {value === "perusahaan" && <CompanyForm />}
            {value === "absensi" && <AttendanceForm />}
            {value === "cuti" && <LeaveTypesForm />}
            {value === "pengguna" && <UsersRoles />}
          </>
        )}
      </Tabs>
    </div>
  );
}
