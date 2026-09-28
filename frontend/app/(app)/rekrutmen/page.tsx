"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Building2, MapPin, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { AccessGuard } from "./_components/AccessGuard";
import { CreateJobDialog } from "./_components/CreateJobDialog";
import {
  JOB_STATUS_META,
  asRows,
  normalizeJob,
  type Job,
} from "./_components/shared";

function salaryText(job: Job): string {
  if (job.salary_min !== null && job.salary_max !== null) {
    return `${formatRupiah(job.salary_min)} – ${formatRupiah(job.salary_max)}`;
  }
  return "Gaji tidak dicantumkan";
}

function JobCard({
  job,
  acting,
  onPublish,
  onCloseJob,
}: {
  job: Job;
  acting: boolean;
  onPublish: () => void;
  onCloseJob: () => void;
}) {
  const meta = JOB_STATUS_META[job.status] ?? {
    label: job.status,
    variant: "neutral" as const,
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-balance text-base font-semibold text-text">{job.title}</h2>
        <Badge variant={meta.variant} className="shrink-0">
          {meta.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5 text-[13px] text-text-secondary">
        {job.department_name && (
          <p className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
            {job.department_name}
          </p>
        )}
        {job.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
            {job.location}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
          <span className="tnum font-medium text-text">{job.applicants_count}</span>
          <span>pelamar</span>
        </p>
      </div>

      <p className="tnum text-sm font-medium text-text">{salaryText(job)}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/rekrutmen/${job.id}`}
          className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-surface px-3 text-[13px] font-medium text-text transition-colors duration-150 hover:bg-muted"
        >
          Lihat pipeline
        </Link>
        {job.status === "published" && (
          <Button variant="outline" size="sm" loading={acting} onClick={onCloseJob}>
            Tutup lowongan
          </Button>
        )}
        {job.status === "draft" && (
          <Button variant="secondary" size="sm" loading={acting} onClick={onPublish}>
            Publikasikan
          </Button>
        )}
      </div>
    </Card>
  );
}

function JobList() {
  const jobs = useApi(() =>
    api
      .get<unknown>("/jobs")
      .then((raw) => asRows(raw).map(normalizeJob).filter((j) => j.id || j.title)),
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  async function changeStatus(job: Job, status: "published" | "closed") {
    setActingId(job.id);
    setActionError(null);
    try {
      await api.put(`/jobs/${job.id}`, { status });
      await jobs.reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal memperbarui status lowongan.",
      );
    } finally {
      setActingId(null);
    }
  }

  const list = jobs.data ?? [];

  return (
    <div>
      <PageHeader
        title="Rekrutmen"
        description="Kelola lowongan pekerjaan dan pantau pipeline kandidat."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Buat lowongan
          </Button>
        }
      />

      {actionError && (
        <p role="alert" className="mb-4 text-[13px] text-danger-text">
          {actionError}
        </p>
      )}

      {jobs.loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Memuat lowongan"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton shape="text" className="w-40" />
                <Skeleton shape="text" className="w-20" />
              </div>
              <Skeleton shape="text" className="mt-4 w-32" />
              <Skeleton shape="text" className="mt-2 w-24" />
              <Skeleton shape="text" className="mt-4 w-48" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.error ? (
        <div role="alert" className="flex flex-col items-start gap-2 py-6">
          <p className="text-sm font-medium text-text">Lowongan gagal dimuat</p>
          <p className="text-[13px] text-text-secondary">{jobs.error}</p>
          <Button variant="outline" size="sm" onClick={() => void jobs.reload()} className="mt-1">
            Muat ulang
          </Button>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" aria-hidden />}
          title="Belum ada lowongan"
          description="Buat lowongan pertama untuk mulai menerima pelamar."
          actionLabel="Buat lowongan"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((job) => (
            <JobCard
              key={job.id || job.title}
              job={job}
              acting={actingId === job.id}
              onPublish={() => void changeStatus(job, "published")}
              onCloseJob={() => void changeStatus(job, "closed")}
            />
          ))}
        </div>
      )}

      <CreateJobDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void jobs.reload()}
      />
    </div>
  );
}

export default function RekrutmenPage() {
  return (
    <AccessGuard>
      <JobList />
    </AccessGuard>
  );
}
