"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DOCUMENT_CATEGORY_OPTIONS, HR_ROLES, type EmployeeOption } from "./types";
import { asRows, Field, pickString } from "./helpers";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "docx"];

interface FormErrors {
  employee_id?: string;
  category?: string;
  name?: string;
  expiry_date?: string;
  file?: string;
  submit?: string;
}

function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const { user, hasRole } = useAuth();
  const isHr = hasRole(...HR_ROLES);

  const [employeeId, setEmployeeId] = React.useState("");
  const [category, setCategory] = React.useState("personal");
  const [name, setName] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [uploading, setUploading] = React.useState(false);

  // Daftar karyawan hanya dibutuhkan peran HR; diambil saat dialog dibuka.
  const employees = useApi(
    async () => {
      if (!isHr || !open) return [] as EmployeeOption[];
      const raw = await api.get<unknown>("/employees", { query: { per_page: 100 } });
      return asRows(raw).map((r) => ({
        id: pickString(r, ["id", "employee_id", "uuid"]),
        full_name: pickString(r, ["full_name", "name", "employee_name"]),
      }));
    },
    [isHr, open],
  );

  function reset() {
    setEmployeeId("");
    setCategory("personal");
    setName("");
    setExpiryDate("");
    setFile(null);
    setErrors({});
  }

  function handleClose() {
    if (uploading) return;
    reset();
    onClose();
  }

  function validate(resolvedEmployeeId: string): FormErrors {
    const next: FormErrors = {};
    if (!resolvedEmployeeId) next.employee_id = "Pilih karyawan pemilik dokumen";
    if (!category) next.category = "Pilih kategori dokumen";
    if (!name.trim()) next.name = "Masukkan nama dokumen";
    if (!file) {
      next.file = "Pilih file yang akan diunggah";
    } else {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTS.includes(ext)) {
        next.file = "Tipe file harus PDF, JPG, PNG, atau DOCX";
      } else if (file.size > MAX_FILE_BYTES) {
        next.file = "Ukuran file maksimal 10 MB";
      }
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedEmployeeId = isHr ? employeeId : (user?.employee?.id ?? "");
    const validation = validate(resolvedEmployeeId);
    setErrors(validation);
    const order = ["employee_id", "category", "name", "expiry_date", "file"] as const;
    const firstInvalid = order.find((k) => validation[k]);
    if (firstInvalid) {
      const elId: Record<(typeof order)[number], string> = {
        employee_id: "doc-karyawan",
        category: "doc-kategori",
        name: "doc-nama",
        expiry_date: "doc-kedaluwarsa",
        file: "doc-file",
      };
      document.getElementById(elId[firstInvalid])?.focus();
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("employee_id", resolvedEmployeeId);
      formData.set("category", category);
      formData.set("name", name.trim());
      if (expiryDate) formData.set("expiry_date", expiryDate);
      if (file) formData.set("file", file);
      await api.upload("/documents/upload", formData);
      reset();
      onUploaded();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Gagal mengunggah dokumen. Coba lagi.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Unggah dokumen" description="Tambahkan dokumen ke repositori">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4" noValidate>
        {isHr && (
          <Field label="Karyawan" htmlFor="doc-karyawan" required error={errors.employee_id}>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={employees.loading}
            >
              <option value="">
                {employees.loading ? "Memuat karyawan…" : "Pilih karyawan"}
              </option>
              {employees.data?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || emp.id}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {isHr && employees.error && (
          <p role="alert" className="-mt-2 text-[13px] text-danger-text">
            Daftar karyawan gagal dimuat.{" "}
            <button type="button" onClick={() => void employees.reload()} className="text-accent underline underline-offset-2">
              Muat ulang
            </button>
          </p>
        )}

        <Field label="Kategori" htmlFor="doc-kategori" required error={errors.category}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {DOCUMENT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nama dokumen" htmlFor="doc-nama" required error={errors.name}>
          <Input
            placeholder="Contoh: KTP"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Tanggal kedaluwarsa" htmlFor="doc-kedaluwarsa" error={errors.expiry_date} hint="Opsional. Kosongkan bila dokumen tidak memiliki masa berlaku.">
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </Field>

        <Field label="File" htmlFor="doc-file" required error={errors.file} hint="PDF, JPG, PNG, atau DOCX, maksimal 10 MB.">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-text hover:file:bg-border"
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
          <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
            Batal
          </Button>
          <Button type="submit" loading={uploading}>
            <Upload className="h-4 w-4" aria-hidden />
            Unggah
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export { UploadDialog };
