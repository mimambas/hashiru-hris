"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cx } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  TEXTAREA_CLASS,
  asRows,
  pickString,
  type RawRow,
} from "./shared";

interface Template {
  key: string;
  label: string;
  title: string;
  description: string;
  requirements: string;
  salary_min: string;
  salary_max: string;
}

const TEMPLATES: Template[] = [
  {
    key: "admin",
    label: "Staf administrasi",
    title: "Staf Administrasi",
    description:
      "Membantu kelancaran operasional administrasi perusahaan, termasuk pengarsipan dokumen, pengelolaan data, dan koordinasi dengan tim terkait.",
    requirements:
      "Minimal lulusan SMA/sederajat\nMampu mengoperasikan Microsoft Office\nTeliti dan rapi dalam pengarsipan",
    salary_min: "4500000",
    salary_max: "6000000",
  },
  {
    key: "sales",
    label: "Sales",
    title: "Sales Executive",
    description:
      "Mencari dan mengembangkan pelanggan baru, menjaga hubungan dengan pelanggan existing, serta mencapai target penjualan yang ditetapkan perusahaan.",
    requirements:
      "Minimal lulusan SMA/sederajat\nMemiliki kemampuan komunikasi yang baik\nBerorientasi pada target",
    salary_min: "5000000",
    salary_max: "8000000",
  },
  {
    key: "engineer",
    label: "Software engineer",
    title: "Software Engineer",
    description:
      "Merancang, mengembangkan, dan memelihara aplikasi perangkat lunak sesuai kebutuhan bisnis, serta berkolaborasi dengan tim produk.",
    requirements:
      "Minimal lulusan S1 Teknik Informatika atau setara\nMenguasai salah satu bahasa pemrograman modern\nMampu bekerja dalam tim agile",
    salary_min: "10000000",
    salary_max: "18000000",
  },
  {
    key: "cs",
    label: "Customer service",
    title: "Customer Service",
    description:
      "Melayani pertanyaan dan keluhan pelanggan melalui berbagai kanal komunikasi dengan ramah, cepat, dan solutif.",
    requirements:
      "Minimal lulusan SMA/sederajat\nKomunikatif dan sabar\nMampu mengoperasikan komputer",
    salary_min: "4500000",
    salary_max: "6500000",
  },
];

interface Department {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  template: "",
  title: "",
  departmentId: "",
  location: "",
  salaryMin: "",
  salaryMax: "",
  employmentType: "",
  description: "",
  requirements: "",
};

function CreateJobDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const departments = useApi(() =>
    api.get<unknown>("/departments").then((raw): Department[] =>
      asRows(raw)
        .map((r: RawRow) => ({
          id: pickString(r, ["id", "department_id"]),
          name: pickString(r, ["name", "department_name"]),
        }))
        .filter((d) => d.id && d.name),
    ),
  );

  // Reset form setiap dialog dibuka.
  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setErrors({});
      setSubmitError(null);
    }
  }, [open ]);

  const set = (key: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function applyTemplate(templateKey: string) {
    const tpl = TEMPLATES.find((t) => t.key === templateKey);
    setForm((f) => ({
      ...f,
      template: templateKey,
      title: tpl?.title ?? f.title,
      description: tpl?.description ?? f.description,
      requirements: tpl?.requirements ?? f.requirements,
      salaryMin: tpl?.salary_min ?? f.salaryMin,
      salaryMax: tpl?.salary_max ?? f.salaryMax,
    }));
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Isi judul lowongan";
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
      next.salaryMax = "Gaji maksimum harus lebih besar atau sama dengan gaji minimum";
    }
    if (form.salaryMin && Number(form.salaryMin) < 0) next.salaryMin = "Gaji tidak boleh negatif";
    if (form.salaryMax && Number(form.salaryMax) < 0) next.salaryMax = "Gaji tidak boleh negatif";
    return next;
  }

  const fieldIds: Record<string, string> = {
    title: "job-title",
    departmentId: "job-department",
    location: "job-location",
    salaryMin: "job-salary-min",
    salaryMax: "job-salary-max",
    employmentType: "job-employment-type",
    description: "job-description",
    requirements: "job-requirements",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = Object.keys(nextErrors)[0];
      document.getElementById(fieldIds[first])?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post("/jobs", {
        title: form.title.trim(),
        department_id: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        requirements: form.requirements.trim() || undefined,
        salary_min: form.salaryMin ? Number(form.salaryMin) : undefined,
        salary_max: form.salaryMax ? Number(form.salaryMax) : undefined,
        employment_type: form.employmentType || undefined,
        status: "draft",
      });
      onCreated();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal membuat lowongan. Coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name: string) {
    const msg = errors[name];
    if (!msg) return null;
    return (
      <p id={`${fieldIds[name]}-error`} className="mt-1 text-[13px] text-danger-text">
        {msg}
      </p>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buat lowongan"
      description="Isi detail posisi yang akan dibuka. Lowongan tersimpan sebagai draf."
      className="max-w-2xl"
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div>
            <Label htmlFor="job-template">Gunakan template posisi</Label>
            <Select
              id="job-template"
              value={form.template}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">— Tanpa template —</option>
              {TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[13px] text-text-tertiary">
              Template mengisi judul, deskripsi, persyaratan, dan rentang gaji otomatis.
            </p>
          </div>

          <div>
            <Label htmlFor="job-title">Judul</Label>
            <Input
              id="job-title"
              value={form.title}
              onChange={set("title")}
              invalid={!!errors.title}
              aria-describedby={errors.title ? "job-title-error" : undefined}
              placeholder="mis. Sales Executive"
            />
            {fieldError("title")}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="job-department">Departemen</Label>
              <Select
                id="job-department"
                value={form.departmentId}
                onChange={set("departmentId")}
                disabled={departments.loading}
              >
                <option value="">— Pilih departemen —</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              {departments.error && (
                <p className="mt-1 text-[13px] text-text-secondary">
                  Daftar departemen gagal dimuat.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="job-location">Lokasi</Label>
              <Input
                id="job-location"
                value={form.location}
                onChange={set("location")}
                placeholder="mis. Jakarta Selatan / Remote"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="job-salary-min">Gaji minimum (Rp)</Label>
              <Input
                id="job-salary-min"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.salaryMin}
                onChange={set("salaryMin")}
                invalid={!!errors.salaryMin}
                aria-describedby={errors.salaryMin ? "job-salary-min-error" : undefined}
                placeholder="mis. 5000000"
              />
              {fieldError("salaryMin")}
            </div>
            <div>
              <Label htmlFor="job-salary-max">Gaji maksimum (Rp)</Label>
              <Input
                id="job-salary-max"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.salaryMax}
                onChange={set("salaryMax")}
                invalid={!!errors.salaryMax}
                aria-describedby={errors.salaryMax ? "job-salary-max-error" : undefined}
                placeholder="mis. 8000000"
              />
              {fieldError("salaryMax")}
            </div>
          </div>

          <div>
            <Label htmlFor="job-employment-type">Tipe pekerjaan</Label>
            <Select id="job-employment-type" value={form.employmentType} onChange={set("employmentType")}>
              <option value="">— Pilih tipe —</option>
              <option value="full-time">Penuh waktu</option>
              <option value="part-time">Paruh waktu</option>
              <option value="contract">Kontrak</option>
              <option value="internship">Magang</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="job-description">Deskripsi</Label>
            <textarea
              id="job-description"
              value={form.description}
              onChange={set("description")}
              className={TEXTAREA_CLASS}
              placeholder="Tanggung jawab dan gambaran pekerjaan"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="job-requirements">Persyaratan</Label>
            <textarea
              id="job-requirements"
              value={form.requirements}
              onChange={set("requirements")}
              className={TEXTAREA_CLASS}
              placeholder="Kualifikasi yang dibutuhkan"
              rows={4}
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

export { CreateJobDialog };
