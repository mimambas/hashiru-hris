"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { EMAIL_RE, SOURCE_LABELS } from "./shared";

const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS);

function AddCandidateDialog({
  jobId,
  open,
  onClose,
  onCreated,
}: {
  jobId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [source, setSource] = React.useState("");
  const [resumeUrl, setResumeUrl] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setPhone("");
      setSource("");
      setResumeUrl("");
      setErrors({});
      setSubmitError(null);
    }
  }, [open ]);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Isi nama lengkap kandidat";
    if (!email.trim()) next.email = "Isi email kandidat";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Format email tidak valid";
    if (resumeUrl.trim() && !/^https?:\/\/.+/i.test(resumeUrl.trim())) {
      next.resumeUrl = "Tautan CV harus diawali http:// atau https://";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstId =
        Object.keys(nextErrors)[0] === "fullName" ? "candidate-name" : "candidate-email";
      document.getElementById(firstId)?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/jobs/${jobId}/applicants`, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        resume_url: resumeUrl.trim() || undefined,
        source: source || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menambah kandidat. Coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah kandidat"
      description="Kandidat baru masuk ke kolom Screening."
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="candidate-name">Nama lengkap</Label>
            <Input
              id="candidate-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "candidate-name-error" : undefined}
              placeholder="Nama lengkap kandidat"
            />
            {errors.fullName && (
              <p id="candidate-name-error" className="mt-1 text-[13px] text-danger-text">
                {errors.fullName}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="candidate-email">Email</Label>
            <Input
              id="candidate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={!!errors.email}
              aria-describedby={errors.email ? "candidate-email-error" : undefined}
              placeholder="nama@email.com"
            />
            {errors.email && (
              <p id="candidate-email-error" className="mt-1 text-[13px] text-danger-text">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="candidate-phone">Telepon</Label>
            <Input
              id="candidate-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="mis. 0812xxxxxxx"
            />
          </div>

          <div>
            <Label htmlFor="candidate-source">Sumber</Label>
            <Select id="candidate-source" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">— Pilih sumber —</option>
              {SOURCE_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {SOURCE_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="candidate-resume">Tautan CV</Label>
            <Input
              id="candidate-resume"
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              invalid={!!errors.resumeUrl}
              aria-describedby={errors.resumeUrl ? "candidate-resume-error" : undefined}
              placeholder="https://…"
            />
            {errors.resumeUrl && (
              <p id="candidate-resume-error" className="mt-1 text-[13px] text-danger-text">
                {errors.resumeUrl}
              </p>
            )}
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

export { AddCandidateDialog };
