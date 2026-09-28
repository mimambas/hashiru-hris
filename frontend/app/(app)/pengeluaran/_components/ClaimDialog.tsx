"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cx } from "@/lib/format";
import { EXPENSE_TYPE_OPTIONS, expenseTypeLabel } from "./types";
import { Field, pickString } from "./helpers";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const RECEIPT_REQUIRED_ABOVE = 100_000;

/** YYYY-MM-DD lokal (tanpa geser zona waktu UTC). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

interface FormErrors {
  claim_date?: string;
  type?: string;
  amount?: string;
  description?: string;
  receipt?: string;
  submit?: string;
}

const TEXTAREA_CLASS =
  "flex min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-base sm:text-sm text-text placeholder:text-text-tertiary";

function ClaimDialog({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [claimDate, setClaimDate] = React.useState("");
  const [type, setType] = React.useState("transport");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  const todayISO = React.useMemo(() => toISODate(new Date()), []);
  const minDateISO = React.useMemo(() => addDaysISO(new Date(), -30), []);

  function reset() {
    setClaimDate("");
    setType("transport");
    setAmount("");
    setDescription("");
    setFile(null);
    setErrors({});
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    const amountNum = Number(amount);

    if (!claimDate) {
      next.claim_date = "Pilih tanggal pengeluaran";
    } else if (claimDate > todayISO) {
      next.claim_date = "Tanggal pengeluaran tidak boleh di masa depan";
    } else if (claimDate < minDateISO) {
      next.claim_date = "Tanggal pengeluaran maksimal 30 hari yang lalu";
    }

    if (!type) next.type = "Pilih tipe pengeluaran";

    if (!amount.trim()) {
      next.amount = "Masukkan nominal pengeluaran";
    } else if (Number.isNaN(amountNum) || amountNum <= 0) {
      next.amount = "Nominal harus lebih dari Rp 0";
    }

    if (!Number.isNaN(amountNum) && amountNum > RECEIPT_REQUIRED_ABOVE && !file) {
      next.receipt = "Unggah struk untuk klaim di atas Rp 100.000";
    }
    if (file && file.size > MAX_RECEIPT_BYTES) {
      next.receipt = "Ukuran file maksimal 10 MB";
    }

    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    const fieldIds = {
      claim_date: "claim-tanggal",
      type: "claim-tipe",
      amount: "claim-nominal",
      description: "claim-deskripsi",
      receipt: "claim-struk",
    } as const;
    const firstInvalid = (Object.keys(fieldIds) as Array<keyof typeof fieldIds>).find(
      (k) => validation[k],
    );
    if (firstInvalid) {
      document.getElementById(fieldIds[firstInvalid])?.focus();
      return;
    }

    const employeeId = user?.employee?.id;
    if (!employeeId) {
      setErrors({ submit: "Akun Anda belum terhubung ke data karyawan. Hubungi HR." });
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl: string | undefined;
      if (file) {
        const formData = new FormData();
        formData.set("employee_id", employeeId);
        formData.set("category", "personal");
        formData.set("name", `Struk klaim ${expenseTypeLabel(type)} ${claimDate}`);
        formData.set("file", file);
        const uploaded = await api.upload<Record<string, unknown>>("/documents/upload", formData);
        receiptUrl =
          pickString(uploaded as Record<string, unknown>, ["file_url", "url", "path", "fileUrl"]) ||
          file.name;
      }

      await api.post("/expenses", {
        claim_date: claimDate,
        type,
        amount: Number(amount),
        description: description.trim() || undefined,
        receipt_url: receiptUrl,
      });

      reset();
      onSubmitted();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Gagal mengajukan klaim. Coba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Ajukan klaim" description="Isi detail pengeluaran yang akan diklaim">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4" noValidate>
        <Field label="Tanggal" htmlFor="claim-tanggal" required error={errors.claim_date}>
          <Input
            type="date"
            value={claimDate}
            min={minDateISO}
            max={todayISO}
            onChange={(e) => setClaimDate(e.target.value)}
          />
        </Field>

        <Field label="Tipe" htmlFor="claim-tipe" required error={errors.type}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {EXPENSE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nominal" htmlFor="claim-nominal" required error={errors.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary" aria-hidden>
              Rp
            </span>
            <Input
              type="number"
              min={1}
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9 tnum"
            />
          </div>
        </Field>

        <Field label="Deskripsi" htmlFor="claim-deskripsi" error={errors.description}>
          <textarea
            placeholder="Contoh: Bensin perjalanan dinas ke Bandung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cx(TEXTAREA_CLASS, errors.description && "border-danger")}
          />
        </Field>

        <Field
          label="Struk"
          htmlFor="claim-struk"
          error={errors.receipt}
          hint="Struk wajib bila nominal di atas Rp 100.000. Format JPG, PNG, atau PDF, maksimal 10 MB."
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={cx(
              "block w-full text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-text hover:file:bg-border",
              errors.receipt && "rounded-control border border-danger",
            )}
          />
        </Field>
        {file && (
          <p className="tnum -mt-2 text-xs text-text-tertiary">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        )}

        {errors.submit && (
          <p role="alert" className="text-[13px] text-danger-text">
            {errors.submit}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajukan klaim
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export { ClaimDialog };
