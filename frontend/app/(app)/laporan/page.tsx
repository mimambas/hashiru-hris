"use client";

import {
  CalendarCheck,
  Clock3,
  HeartPulse,
  Plane,
  ReceiptText,
  ShieldAlert,
  TrendingDown,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCard, type ReportConfig } from "./_components/ReportCard";

const ALLOWED_ROLES: Role[] = [
  "super_admin",
  "hr_director",
  "hr_manager",
  "hr_officer",
  "finance_officer",
];

const REPORTS: ReportConfig[] = [
  {
    key: "headcount",
    title: "Headcount",
    description: "Jumlah dan komposisi karyawan pada rentang tanggal.",
    endpoint: "/reports/headcount",
    filter: "range",
    icon: <Users className="h-4 w-4" aria-hidden />,
  },
  {
    key: "turnover",
    title: "Turnover",
    description: "Tingkat keluar-masuk karyawan pada rentang tanggal.",
    endpoint: "/reports/turnover",
    filter: "range",
    icon: <TrendingDown className="h-4 w-4" aria-hidden />,
  },
  {
    key: "attendance",
    title: "Absensi",
    description: "Rekap kehadiran, keterlambatan, dan ketidakhadiran.",
    endpoint: "/reports/attendance",
    filter: "range",
    departmentFilter: true,
    icon: <CalendarCheck className="h-4 w-4" aria-hidden />,
  },
  {
    key: "leave",
    title: "Cuti",
    description: "Pengajuan dan pemakaian cuti per tipe dalam setahun.",
    endpoint: "/reports/leave",
    filter: "year",
    icon: <Plane className="h-4 w-4" aria-hidden />,
  },
  {
    key: "overtime",
    title: "Lembur",
    description: "Total jam dan biaya lembur pada rentang tanggal.",
    endpoint: "/reports/overtime",
    filter: "range",
    icon: <Clock3 className="h-4 w-4" aria-hidden />,
  },
  {
    key: "payroll",
    title: "Payroll",
    description: "Rekap penggajian per periode bulan.",
    endpoint: "/reports/payroll",
    filter: "period",
    icon: <Wallet className="h-4 w-4" aria-hidden />,
  },
  {
    key: "pph21",
    title: "PPh 21",
    description: "Rekap potongan PPh 21 per periode bulan.",
    endpoint: "/reports/pph21",
    filter: "period",
    icon: <ReceiptText className="h-4 w-4" aria-hidden />,
  },
  {
    key: "bpjs",
    title: "BPJS",
    description: "Iuran BPJS Kesehatan dan Ketenagakerjaan per periode.",
    endpoint: "/reports/bpjs",
    filter: "period",
    icon: <HeartPulse className="h-4 w-4" aria-hidden />,
  },
  {
    key: "new-hires",
    title: "Karyawan baru",
    description: "Daftar karyawan yang bergabung pada rentang tanggal.",
    endpoint: "/reports/new-hires",
    filter: "range",
    icon: <UserPlus className="h-4 w-4" aria-hidden />,
  },
  {
    key: "exits",
    title: "Karyawan keluar",
    description: "Daftar karyawan yang keluar pada rentang tanggal.",
    endpoint: "/reports/exits",
    filter: "range",
    icon: <UserMinus className="h-4 w-4" aria-hidden />,
  },
];

export default function LaporanPage() {
  const { hasRole } = useAuth();

  if (!hasRole(...ALLOWED_ROLES)) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" aria-hidden />}
          title="Anda tidak memiliki akses ke modul ini"
          description="Modul laporan hanya tersedia untuk tim HR dan keuangan."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Unduh laporan standar HR dalam format Excel atau PDF."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {REPORTS.map((config) => (
          <ReportCard key={config.key} config={config} />
        ))}
      </div>
    </div>
  );
}
