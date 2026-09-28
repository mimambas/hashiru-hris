"use client";

import * as React from "react";
import { CalendarClock, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { ScheduleInterviewDialog } from "./ScheduleInterviewDialog";
import {
  INTERVIEW_STATUS_META,
  INTERVIEW_TYPE_LABELS,
  asRows,
  normalizeInterview,
  type Applicant,
  type RawRow,
} from "./shared";

function InterviewSection({
  jobId,
  applicants,
}: {
  jobId: string;
  applicants: Applicant[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const query = useApi<RawRow[] | null>(() =>
    api
      .get<unknown>("/interviews", { query: { job_id: jobId } })
      .then((raw): RawRow[] | null => asRows(raw))
      .catch(() => null),
  [jobId]);

  const interviews = React.useMemo(
    () =>
      (query.data ?? [])
        .map(normalizeInterview)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [query.data],
  );

  const nameById = React.useMemo(
    () => new Map(applicants.map((a) => [a.id, a.full_name])),
    [applicants],
  );

  return (
    <section aria-label="Jadwal interview">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">Jadwal interview</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Jadwalkan interview
        </Button>
      </div>

      {query.loading ? (
        <div className="flex flex-col gap-2" aria-label="Memuat jadwal interview">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" aria-hidden />}
          title="Belum ada jadwal interview"
          description="Jadwalkan interview pertama."
          actionLabel="Jadwalkan interview"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Pewawancara</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((iv) => {
                const meta = INTERVIEW_STATUS_META[iv.status] ?? {
                  label: iv.status,
                  variant: "neutral" as const,
                };
                return (
                  <TableRow key={iv.id || `${iv.applicant_id}-${iv.scheduled_at}`}>
                    <TableCell className="font-medium">
                      {iv.applicant_name || nameById.get(iv.applicant_id) || "—"}
                    </TableCell>
                    <TableCell className="tnum whitespace-nowrap">
                      {formatDateTime(iv.scheduled_at)}
                    </TableCell>
                    <TableCell>{INTERVIEW_TYPE_LABELS[iv.type] ?? iv.type}</TableCell>
                    <TableCell>
                      {iv.interviewers.length > 0 ? iv.interviewers.join(", ") : "—"}
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

      <ScheduleInterviewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => void query.reload()}
        applicants={applicants}
      />
    </section>
  );
}

export { InterviewSection };
