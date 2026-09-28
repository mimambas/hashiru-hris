"use client";

import * as React from "react";
import { MoreVertical, UserPlus, X } from "lucide-react";
import { cx } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { AddCandidateDialog } from "./AddCandidateDialog";
import {
  SOURCE_LABELS,
  STAGES,
  type Applicant,
  type StageColumn,
  type StageKey,
} from "./shared";
import type { PipelineState } from "./use-pipeline";

/* ================= Kartu kandidat ================= */

function ApplicantCard({
  applicant,
  currentStage,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  applicant: Applicant;
  currentStage: StageKey;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (applicantId: string, target: StageKey) => void;
}) {
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", applicant.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-grabbed={dragging}
      className={cx(
        "cursor-grab rounded-control border border-border bg-surface p-3 shadow-sm active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text">{applicant.full_name}</p>
        <DropdownMenu
          label={`Pindah ${applicant.full_name} ke stage lain`}
          trigger={
            <button
              type="button"
              aria-label={`Pindah ${applicant.full_name} ke stage lain`}
              className="-mr-1 rounded p-1 text-text-tertiary transition-colors hover:bg-muted hover:text-text"
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </button>
          }
        >
          {applicantStages(currentStage).map((s) => (
            <DropdownMenuItem key={s.key} onClick={() => onMove(applicant.id, s.key)}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </div>
      {applicant.source && (
        <p className="mt-0.5 text-xs text-text-secondary">
          {SOURCE_LABELS[applicant.source] ?? applicant.source}
        </p>
      )}
      {applicant.score !== null && (
        <div className="mt-2">
          <Badge variant="info" className="tnum">
            Skor {applicant.score}
          </Badge>
        </div>
      )}
      {applicant.email && (
        <p className="mt-1.5 truncate text-xs text-text-tertiary" title={applicant.email}>
          {applicant.email}
        </p>
      )}
    </article>
  );
}

function applicantStages(currentStage: StageKey) {
  return STAGES.filter((s) => s.key !== currentStage);
}

/* ================= Kolom kanban ================= */

function KanbanColumn({
  column,
  dropActive,
  draggingId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMove,
}: {
  column: StageColumn;
  dropActive: boolean;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (applicantId: string) => void;
  onMove: (applicantId: string, target: StageKey) => void;
}) {
  return (
    <section
      aria-label={`${column.label}, ${column.applicants.length} kandidat`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className={cx(
        "flex min-h-40 w-72 shrink-0 flex-col rounded-card border border-border bg-muted/40",
        dropActive && "border-accent ring-2 ring-accent/40",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="text-sm font-semibold text-text">{column.label}</h3>
        <span className="tnum rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
          {column.applicants.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        {column.applicants.map((a) => (
          <ApplicantCard
            key={a.id}
            applicant={a}
            currentStage={column.key}
            dragging={draggingId === a.id}
            onDragStart={() => onDragStart(a.id)}
            onDragEnd={onDragEnd}
            onMove={onMove}
          />
        ))}
        {column.applicants.length === 0 && (
          <p className="rounded-control border border-dashed border-border px-3 py-6 text-center text-xs text-text-tertiary">
            Belum ada kandidat
          </p>
        )}
      </div>
    </section>
  );
}

/* ================= Bagian pipeline ================= */

function KanbanBoard({ jobId, pipeline }: { jobId: string; pipeline: PipelineState }) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropKey, setDropKey] = React.useState<StageKey | null>(null);

  const total = React.useMemo(
    () => (pipeline.columns ?? []).reduce((s, c) => s + c.applicants.length, 0),
    [pipeline.columns],
  );

  if (pipeline.loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4" aria-label="Memuat pipeline">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex w-72 shrink-0 flex-col gap-2 rounded-card border border-border bg-surface p-4"
          >
            <Skeleton shape="text" className="w-24" />
            <Skeleton className="mt-2 h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (pipeline.error || !pipeline.columns) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 py-6">
        <p className="text-sm font-medium text-text">Pipeline gagal dimuat</p>
        <p className="text-[13px] text-text-secondary">
          {pipeline.error ?? "Data tidak tersedia."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void pipeline.reload()} className="mt-1">
          Muat ulang
        </Button>
      </div>
    );
  }

  return (
    <section aria-label="Pipeline kandidat">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="tnum text-sm text-text-secondary">{total} kandidat dalam pipeline</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" aria-hidden />
          Tambah kandidat
        </Button>
      </div>

      {pipeline.moveError && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-control border border-danger/40 bg-danger-soft px-4 py-3"
        >
          <p className="text-[13px] text-danger-text">{pipeline.moveError}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={pipeline.clearMoveError}
            aria-label="Tutup pesan error"
            className="shrink-0"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            dropActive={dropKey === column.key}
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDropKey(null);
            }}
            onDragOver={() => setDropKey(column.key)}
            onDragLeave={() => setDropKey((k) => (k === column.key ? null : k))}
            onDrop={(id) => {
              setDropKey(null);
              void pipeline.moveApplicant(id, column.key);
            }}
            onMove={(id, target) => void pipeline.moveApplicant(id, target)}
          />
        ))}
      </div>

      <AddCandidateDialog
        jobId={jobId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => void pipeline.reload()}
      />
    </section>
  );
}

export { KanbanBoard };
