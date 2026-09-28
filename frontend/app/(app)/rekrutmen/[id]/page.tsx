"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { AccessGuard } from "../_components/AccessGuard";
import { InterviewSection } from "../_components/InterviewSection";
import { KanbanBoard } from "../_components/KanbanBoard";
import { usePipeline } from "../_components/use-pipeline";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_META,
  normalizeJobDetail,
  type Job,
} from "../_components/shared";

function JobHeader({ job }: { job: Job }) {
  const meta = JOB_STATUS_META[job.status] ?? {
    label: job.status,
    variant: "neutral" as const,
  };
  const salary =
    job.salary_min !== null && job.salary_max !== null
      ? `${formatRupiah(job.salary_min)} – ${formatRupiah(job.salary_max)}`
      : "Gaji tidak dicantumkan";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-text">
          {job.title}
        </h1>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text-secondary">
        {job.department_name && (
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-text-tertiary" aria-hidden />
            {job.department_name}
          </span>
        )}
        {job.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-text-tertiary" aria-hidden />
            {job.location}
          </span>
        )}
        <span className="tnum">{salary}</span>
        {job.employment_type && (
          <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}</span>
        )}
      </div>
    </div>
  );
}

function Detail({ jobId }: { jobId: string }) {
  const jobQuery = useApi(() => api.get<unknown>(`/jobs/${jobId}`).then(normalizeJobDetail), [
    jobId,
  ]);
  const pipeline = usePipeline(jobId);
  const [tab, setTab] = React.useState("pipeline");
  const job = jobQuery.data ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/rekrutmen"
          className="mb-3 inline-flex h-9 items-center gap-2 rounded-control px-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali
        </Link>

        {jobQuery.loading ? (
          <div aria-label="Memuat detail lowongan">
            <Skeleton shape="text" className="h-8 w-64" />
            <Skeleton shape="text" className="mt-2 w-96" />
          </div>
        ) : jobQuery.error ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-text">Detail lowongan gagal dimuat</p>
            <p className="text-[13px] text-text-secondary">{jobQuery.error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void jobQuery.reload()}
              className="mt-1"
            >
              Muat ulang
            </Button>
          </div>
        ) : job ? (
          <JobHeader job={job} />
        ) : (
          <EmptyState
            title="Lowongan tidak ditemukan"
            description="Lowongan mungkin sudah dihapus atau tautan tidak valid."
            actionLabel="Kembali ke rekrutmen"
            onAction={() => window.history.back()}
          />
        )}
      </div>

      <Tabs
        tabs={[
          { value: "pipeline", label: "Pipeline" },
          { value: "interview", label: "Interview" },
        ]}
        value={tab}
        onChange={setTab}
        label="Detail lowongan"
      >
        {(value) =>
          value === "pipeline" ? (
            <KanbanBoard jobId={jobId} pipeline={pipeline} />
          ) : (
            <InterviewSection jobId={jobId} applicants={pipeline.allApplicants} />
          )
        }
      </Tabs>
    </div>
  );
}

export default function RekrutmenDetailPage() {
  const params = useParams();
  const raw = params.id;
  const jobId = Array.isArray(raw) ? (raw[0] ?? "") : ((raw as string | undefined) ?? "");

  return (
    <AccessGuard>
      <Detail jobId={jobId} />
    </AccessGuard>
  );
}
