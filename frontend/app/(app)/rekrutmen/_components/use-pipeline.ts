"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  normalizePipeline,
  type Applicant,
  type StageColumn,
  type StageKey,
} from "./shared";

export interface PipelineState {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  columns: StageColumn[] | null;
  allApplicants: Applicant[];
  moveApplicant: (applicantId: string, target: StageKey) => Promise<void>;
  moveError: string | null;
  movingId: string | null;
  clearMoveError: () => void;
}

/**
 * State pipeline kanban: fetch GET /jobs/{id}/pipeline + pemindahan
 * kandidat antar stage dengan optimistic update dan rollback saat gagal.
 */
export function usePipeline(jobId: string): PipelineState {
  const query = useApi(() => api.get<unknown>(`/jobs/${jobId}/pipeline`), [jobId]);
  const [columns, setColumns] = React.useState<StageColumn[] | null>(null);
  const [moveError, setMoveError] = React.useState<string | null>(null);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (query.data) setColumns(normalizePipeline(query.data));
  }, [query.data]);

  const moveApplicant = React.useCallback(
    async (applicantId: string, target: StageKey) => {
      setColumns((prev) => {
        if (!prev) return prev;
        const current = prev.find((c) => c.applicants.some((a) => a.id === applicantId));
        if (!current || current.key === target) return prev;
        const moved = current.applicants.find((a) => a.id === applicantId);
        if (!moved) return prev;
        return prev.map((c) => {
          if (c.key === current.key) {
            return { ...c, applicants: c.applicants.filter((a) => a.id !== applicantId) };
          }
          if (c.key === target) {
            return { ...c, applicants: [...c.applicants, { ...moved, stage: target }] };
          }
          return c;
        });
      });
      setMoveError(null);
      setMovingId(applicantId);
      try {
        await api.put(`/applicants/${applicantId}/stage`, { stage: target });
      } catch (err) {
        // Rollback: muat ulang state dari server.
        try {
          const fresh = await api.get<unknown>(`/jobs/${jobId}/pipeline`);
          setColumns(normalizePipeline(fresh));
        } catch {
          await query.reload();
        }
        setMoveError(
          err instanceof Error
            ? err.message
            : "Gagal memindahkan kandidat. Coba lagi.",
        );
      } finally {
        setMovingId(null);
      }
    },
    [jobId, query],
  );

  const allApplicants = React.useMemo(
    () => (columns ?? []).flatMap((c) => c.applicants),
    [columns],
  );

  const clearMoveError = React.useCallback(() => setMoveError(null), []);

  return {
    loading: query.loading,
    error: query.error,
    reload: query.reload,
    columns,
    allApplicants,
    moveApplicant,
    moveError,
    movingId,
    clearMoveError,
  };
}
