"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  INTERVIEW_TYPE_LABELS,
  STAGE_LABELS,
  TEXTAREA_CLASS,
  type Applicant,
} from "./shared";

/** "2026-09-30T14:30" dari waktu lokal, untuk nilai min input datetime-local. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ScheduleInterviewDialog({
  open,
  onClose,
  onCreated,
  applicants,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  applicants: Applicant[];
}) {
  const [applicantId, setApplicantId] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [interviewers, setInterviewers] = React.useState("");
  const [type, setType] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const minDateTime = React.useMemo(() => toLocalInputValue(new Date()), [open ]);

  React.useEffect(() => {
    if (open) {
      setApplicantId("");
      setScheduledAt("");
      setInterviewers("");
      setType("");
      setNotes("");
      setErrors({});
      setSubmitError(null);
    }
  }, [open ]);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!applicantId) next.applicantId = "Pilih kandidat";
    if (!scheduledAt) {
      next.scheduledAt = "Pilih tanggal dan waktu interview";
    } else if (new Date(scheduledAt).getTime() < Date.now()) {
      next.scheduledAt = "Waktu interview tidak boleh di masa lalu";
    }
    if (!type) next.type = "Pilih tipe interview";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post("/interviews", {
        applicant_id: applicantId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        interviewers: interviewers
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== ""),
        type,
        notes: notes.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menjadwalkan interview. Coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Jadwalkan interview"
      description="Atur jadwal interview untuk kandidat di pipeline."
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="interview-candidate">Kandidat</Label>
            <Select
              id="interview-candidate"
              value={applicantId}
              onChange={(e) => setApplicantId(e.target.value)}
              invalid={!!errors.applicantId}
              aria-describedby={errors.applicantId ? "interview-candidate-error" : undefined}
            >
              <option value="">— Pilih kandidat —</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} — {STAGE_LABELS[a.stage] ?? a.stage}
                </option>
              ))}
            </Select>
            {errors.applicantId && (
              <p id="interview-candidate-error" className="mt-1 text-[13px] text-danger-text">
                {errors.applicantId}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="interview-datetime">Tanggal dan waktu</Label>
            <Input
              id="interview-datetime"
              type="datetime-local"
              value={scheduledAt}
              min={minDateTime}
              onChange={(e) => setScheduledAt(e.target.value)}
              invalid={!!errors.scheduledAt}
              aria-describedby={errors.scheduledAt ? "interview-datetime-error" : undefined}
            />
            {errors.scheduledAt && (
              <p id="interview-datetime-error" className="mt-1 text-[13px] text-danger-text">
                {errors.scheduledAt}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="interview-interviewers">Pewawancara</Label>
            <Input
              id="interview-interviewers"
              value={interviewers}
              onChange={(e) => setInterviewers(e.target.value)}
              placeholder="Pisahkan beberapa nama dengan koma"
            />
          </div>

          <div>
            <Label htmlFor="interview-type">Tipe</Label>
            <Select
              id="interview-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              invalid={!!errors.type}
              aria-describedby={errors.type ? "interview-type-error" : undefined}
            >
              <option value="">— Pilih tipe —</option>
              {Object.keys(INTERVIEW_TYPE_LABELS).map((key) => (
                <option key={key} value={key}>
                  {INTERVIEW_TYPE_LABELS[key]}
                </option>
              ))}
            </Select>
            {errors.type && (
              <p id="interview-type-error" className="mt-1 text-[13px] text-danger-text">
                {errors.type}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="interview-notes">Catatan</Label>
            <textarea
              id="interview-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={TEXTAREA_CLASS}
              rows={3}
              placeholder="Catatan tambahan untuk pewawancara"
            />
          </div>

          {submitError && (
            <p role="alert" className="text-[13px] text-danger-text">
              {submitError}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" loading={submitting}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export { ScheduleInterviewDialog };
