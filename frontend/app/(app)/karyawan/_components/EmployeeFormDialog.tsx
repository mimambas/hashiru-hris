"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Field,
  formatNpwp,
  validateNik,
  validateNpwp,
} from "./helpers";
import type { Department, EmployeeDetail, Position } from "./types";

/* ---------------- Opsi ---------------- */

const GENDER_OPTIONS = [
  { value: "", label: "Pilih jenis kelamin" },
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "", label: "Pilih status kepegawaian" },
  { value: "permanent", label: "Tetap" },
  { value: "contract", label: "Kontrak" },
  { value: "outsourcing", label: "Alih daya" },
];

const PTKP_OPTIONS = [
  { value: "", label: "Pilih status PTKP" },
  "TK/0", "TK/1", "TK/2", "TK/3",
  "K/0", "K/1", "K/2", "K/3",
].map((v) => (typeof v === "string" && v.includes("/") ? { value: v, label: v } : v as { value: string; label: string }));

const MARITAL_OPTIONS = [
  { value: "", label: "Pilih status pernikahan" },
  { value: "single", label: "Belum menikah" },
  { value: "married", label: "Menikah" },
  { value: "divorced", label: "Cerai" },
  { value: "widowed", label: "Janda/duda" },
];

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  nik: string;
  npwp: string;
  place_of_birth: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  religion: string;
  marital_status: string;
  join_date: string;
  department_id: string;
  position_id: string;
  employment_status: string;
  employment_type: string;
  contract_start: string;
  contract_end: string;
  probation_end: string;
  base_salary: string;
  branch: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  bpjs_kesehatan_no: string;
  bpjs_ketenagakerjaan_no: string;
  ptkp_status: string;
  address_ktp: string;
  address_domisili: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
}

const EMPTY: FormState = {
  full_name: "",
  email: "",
  phone: "",
  nik: "",
  npwp: "",
  place_of_birth: "",
  date_of_birth: "",
  gender: "",
  blood_type: "",
  religion: "",
  marital_status: "",
  join_date: "",
  department_id: "",
  position_id: "",
  employment_status: "",
  employment_type: "",
  contract_start: "",
  contract_end: "",
  probation_end: "",
  base_salary: "",
  branch: "",
  bank_name: "",
  bank_account: "",
  bank_account_name: "",
  bpjs_kesehatan_no: "",
  bpjs_ketenagakerjaan_no: "",
  ptkp_status: "",
  address_ktp: "",
  address_domisili: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
};

function fromDetail(d: EmployeeDetail): FormState {
  const get = (k: keyof EmployeeDetail): string => {
    const v = d[k];
    return v === null || v === undefined ? "" : String(v);
  };
  return {
    ...EMPTY,
    full_name: get("full_name"),
    email: get("email"),
    phone: get("phone"),
    nik: get("nik"),
    npwp: get("npwp") ? formatNpwp(get("npwp")) : "",
    place_of_birth: get("place_of_birth"),
    date_of_birth: (get("date_of_birth") || "").slice(0, 10),
    gender: get("gender"),
    blood_type: get("blood_type"),
    religion: get("religion"),
    marital_status: get("marital_status"),
    join_date: (get("join_date") || "").slice(0, 10),
    department_id: get("department_id"),
    position_id: get("position_id"),
    employment_status: get("employment_status"),
    employment_type: get("employment_type"),
    contract_start: (get("contract_start") || "").slice(0, 10),
    contract_end: (get("contract_end") || "").slice(0, 10),
    probation_end: (get("probation_end") || "").slice(0, 10),
    base_salary: get("base_salary"),
    branch: get("branch"),
    bank_name: get("bank_name"),
    bank_account: get("bank_account"),
    bank_account_name: get("bank_account_name"),
    bpjs_kesehatan_no: get("bpjs_kesehatan_no"),
    bpjs_ketenagakerjaan_no: get("bpjs_ketenagakerjaan_no"),
    ptkp_status: get("ptkp_status"),
    address_ktp: get("address_ktp"),
    address_domisili: get("address_domisili"),
    emergency_contact_name: get("emergency_contact_name"),
    emergency_contact_phone: get("emergency_contact_phone"),
    emergency_contact_relation: get("emergency_contact_relation"),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asList<T>(res: T[] | { items?: T[] } | null): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.items ?? [];
}

/* ---------------- Dialog ---------------- */

export function EmployeeFormDialog({
  open,
  onClose,
  mode,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initial?: EmployeeDetail | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [positions, setPositions] = React.useState<Position[]>([]);

  // Reset form setiap dialog dibuka.
  React.useEffect(() => {
    if (!open) return;
    setForm(initial ? fromDetail(initial) : EMPTY);
    setErrors({});
    setSubmitError(null);
    setSaving(false);
    void api
      .get<Department[] | { items?: Department[] }>("/departments")
      .then((r) => setDepartments(asList(r)))
      .catch(() => setDepartments([]));
    void api
      .get<Position[] | { items?: Position[] }>("/positions")
      .then((r) => setPositions(asList(r)))
      .catch(() => setPositions([]));
  }, [open, initial]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const e: Partial<Record<keyof FormState, string>> = {};
    const f = form;
    if (!f.full_name.trim()) e.full_name = "Nama lengkap wajib diisi";
    if (!f.email.trim()) e.email = "Email wajib diisi";
    else if (!EMAIL_RE.test(f.email.trim())) e.email = "Format email tidak valid";
    const nikErr = validateNik(f.nik);
    if (nikErr) e.nik = nikErr;
    const npwpErr = validateNpwp(f.npwp);
    if (npwpErr) e.npwp = npwpErr;
    if (!f.join_date) e.join_date = "Tanggal bergabung wajib diisi";
    if (f.phone.trim() && f.phone.replace(/\D/g, "").length < 9)
      e.phone = "Nomor telepon minimal 9 digit angka";
    if (f.contract_start && f.contract_end && f.contract_end < f.contract_start)
      e.contract_end = "Tanggal akhir kontrak tidak boleh sebelum tanggal mulai";
    if (f.join_date && f.probation_end && f.probation_end < f.join_date)
      e.probation_end = "Tanggal akhir masa percobaan tidak boleh sebelum tanggal bergabung";
    if (f.base_salary.trim()) {
      const n = Number(f.base_salary.replace(/[^0-9]/g, ""));
      if (Number.isNaN(n) || n < 0) e.base_salary = "Gaji pokok harus angka positif";
    }
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    setSubmitError(null);
    const firstInvalid = Object.keys(errs)[0];
    if (firstInvalid) {
      // Fokus ke field pertama yang invalid (id = "emp-<nama field>").
      document.getElementById(`emp-${firstInvalid}`)?.focus();
      return;
    }
    setSaving(true);
    const f = form;
    const payload: Record<string, unknown> = {
      full_name: f.full_name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim() || null,
      nik: f.nik.trim(),
      npwp: f.npwp.trim() ? f.npwp.replace(/\D/g, "") : null,
      place_of_birth: f.place_of_birth.trim() || null,
      date_of_birth: f.date_of_birth || null,
      gender: f.gender || null,
      blood_type: f.blood_type.trim() || null,
      religion: f.religion.trim() || null,
      marital_status: f.marital_status || null,
      join_date: f.join_date || null,
      department_id: f.department_id || null,
      position_id: f.position_id || null,
      employment_status: f.employment_status || null,
      employment_type: f.employment_type.trim() || null,
      contract_start: f.contract_start || null,
      contract_end: f.contract_end || null,
      probation_end: f.probation_end || null,
      base_salary: f.base_salary.trim() ? Number(f.base_salary.replace(/[^0-9]/g, "")) : null,
      branch: f.branch.trim() || null,
      bank_name: f.bank_name.trim() || null,
      bank_account: f.bank_account.trim() || null,
      bank_account_name: f.bank_account_name.trim() || null,
      bpjs_kesehatan_no: f.bpjs_kesehatan_no.trim() || null,
      bpjs_ketenagakerjaan_no: f.bpjs_ketenagakerjaan_no.trim() || null,
      ptkp_status: f.ptkp_status || null,
      address_ktp: f.address_ktp.trim() || null,
      address_domisili: f.address_domisili.trim() || null,
      emergency_contact_name: f.emergency_contact_name.trim() || null,
      emergency_contact_phone: f.emergency_contact_phone.trim() || null,
      emergency_contact_relation: f.emergency_contact_relation.trim() || null,
    };
    try {
      if (mode === "create") {
        await api.post("/employees", payload);
      } else if (initial) {
        await api.put(`/employees/${initial.id}`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Gagal menyimpan data. Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Tambah karyawan" : "Ubah data karyawan"}
      description={
        mode === "create"
          ? "Lengkapi data karyawan baru. NIK harus 16 digit dan unik."
          : `Perbarui data ${initial?.full_name ?? "karyawan"}.`
      }
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
          {submitError && (
            <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
              {submitError}
            </p>
          )}

          <Section title="Data pribadi">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nama lengkap" htmlFor="emp-full_name" required error={errors.full_name}>
                  <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="cth. Budi Santoso" />
                </Field>
              </div>
              <Field label="Email" htmlFor="emp-email" required error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nama@perusahaan.id" />
              </Field>
              <Field label="Nomor telepon" htmlFor="emp-phone" error={errors.phone}>
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xxxxxxxxxx" />
              </Field>
              <Field label="NIK" htmlFor="emp-nik" required error={errors.nik} hint="16 digit sesuai KTP">
                <Input inputMode="numeric" value={form.nik} onChange={(e) => set("nik", e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="320xxxxxxxxxxxxx" maxLength={16} />
              </Field>
              <Field label="NPWP" htmlFor="emp-npwp" error={errors.npwp} hint="Opsional, 15 digit">
                <Input inputMode="numeric" value={form.npwp} onChange={(e) => set("npwp", e.target.value)} placeholder="12.345.678.9-012.345" />
              </Field>
              <Field label="Tempat lahir" htmlFor="emp-pob" error={errors.place_of_birth}>
                <Input value={form.place_of_birth} onChange={(e) => set("place_of_birth", e.target.value)} />
              </Field>
              <Field label="Tanggal lahir" htmlFor="emp-dob" error={errors.date_of_birth}>
                <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
              </Field>
              <Field label="Jenis kelamin" htmlFor="emp-gender" error={errors.gender}>
                <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Golongan darah" htmlFor="emp-blood" error={errors.blood_type}>
                <Input value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} placeholder="O" maxLength={3} />
              </Field>
              <Field label="Agama" htmlFor="emp-religion" error={errors.religion}>
                <Input value={form.religion} onChange={(e) => set("religion", e.target.value)} />
              </Field>
              <Field label="Status pernikahan" htmlFor="emp-marital" error={errors.marital_status}>
                <Select value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)}>
                  {MARITAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Kepegawaian">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal bergabung" htmlFor="emp-join_date" required error={errors.join_date}>
                <Input type="date" value={form.join_date} onChange={(e) => set("join_date", e.target.value)} />
              </Field>
              <Field label="Cabang" htmlFor="emp-branch" error={errors.branch}>
                <Input value={form.branch} onChange={(e) => set("branch", e.target.value)} placeholder="Jakarta" />
              </Field>
              <Field label="Departemen" htmlFor="emp-department_id" error={errors.department_id}>
                <Select value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
                  <option value="">Pilih departemen</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Jabatan" htmlFor="emp-position_id" error={errors.position_id}>
                <Select value={form.position_id} onChange={(e) => set("position_id", e.target.value)}>
                  <option value="">Pilih jabatan</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status kepegawaian" htmlFor="emp-employment_status" error={errors.employment_status}>
                <Select value={form.employment_status} onChange={(e) => set("employment_status", e.target.value)}>
                  {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipe kepegawaian" htmlFor="emp-employment_type" error={errors.employment_type} hint="cth. full-time, part-time">
                <Input value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)} />
              </Field>
              <Field label="Mulai kontrak" htmlFor="emp-contract_start" error={errors.contract_start}>
                <Input type="date" value={form.contract_start} onChange={(e) => set("contract_start", e.target.value)} />
              </Field>
              <Field label="Akhir kontrak" htmlFor="emp-contract_end" error={errors.contract_end}>
                <Input type="date" value={form.contract_end} onChange={(e) => set("contract_end", e.target.value)} />
              </Field>
              <Field label="Akhir masa percobaan" htmlFor="emp-probation_end" error={errors.probation_end}>
                <Input type="date" value={form.probation_end} onChange={(e) => set("probation_end", e.target.value)} />
              </Field>
              <Field label="Gaji pokok" htmlFor="emp-base_salary" error={errors.base_salary} hint="Angka saja, tanpa titik">
                <Input inputMode="numeric" value={form.base_salary} onChange={(e) => set("base_salary", e.target.value.replace(/[^0-9]/g, ""))} placeholder="8500000" />
              </Field>
            </div>
          </Section>

          <Section title="Rekening & BPJS">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama bank" htmlFor="emp-bank_name" error={errors.bank_name}>
                <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="BCA" />
              </Field>
              <Field label="Nomor rekening" htmlFor="emp-bank_account" error={errors.bank_account}>
                <Input inputMode="numeric" value={form.bank_account} onChange={(e) => set("bank_account", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Nama pemilik rekening" htmlFor="emp-bank_account_name" error={errors.bank_account_name}>
                <Input value={form.bank_account_name} onChange={(e) => set("bank_account_name", e.target.value)} />
              </Field>
              <Field label="Status PTKP" htmlFor="emp-ptkp_status" error={errors.ptkp_status}>
                <Select value={form.ptkp_status} onChange={(e) => set("ptkp_status", e.target.value)}>
                  {PTKP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="No. BPJS Kesehatan" htmlFor="emp-bpjs_kes" error={errors.bpjs_kesehatan_no}>
                <Input value={form.bpjs_kesehatan_no} onChange={(e) => set("bpjs_kesehatan_no", e.target.value)} />
              </Field>
              <Field label="No. BPJS Ketenagakerjaan" htmlFor="emp-bpjs_tk" error={errors.bpjs_ketenagakerjaan_no}>
                <Input value={form.bpjs_ketenagakerjaan_no} onChange={(e) => set("bpjs_ketenagakerjaan_no", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Alamat & kontak darurat">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Alamat KTP" htmlFor="emp-address_ktp" error={errors.address_ktp}>
                  <Input value={form.address_ktp} onChange={(e) => set("address_ktp", e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Alamat domisili" htmlFor="emp-address_domisili" error={errors.address_domisili}>
                  <Input value={form.address_domisili} onChange={(e) => set("address_domisili", e.target.value)} />
                </Field>
              </div>
              <Field label="Nama kontak darurat" htmlFor="emp-ec_name" error={errors.emergency_contact_name}>
                <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
              </Field>
              <Field label="Telepon kontak darurat" htmlFor="emp-ec_phone" error={errors.emergency_contact_phone}>
                <Input type="tel" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
              </Field>
              <Field label="Hubungan kontak darurat" htmlFor="emp-ec_relation" error={errors.emergency_contact_relation}>
                <Input value={form.emergency_contact_relation} onChange={(e) => set("emergency_contact_relation", e.target.value)} placeholder="cth. Istri, Ayah" />
              </Field>
            </div>
          </Section>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {mode === "create" ? "Simpan karyawan" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {children}
    </section>
  );
}
