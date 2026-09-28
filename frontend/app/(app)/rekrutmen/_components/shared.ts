"use client";

/**
 * Tipe, label, dan normalisasi defensif untuk modul rekrutmen.
 * Respons API bisa berbentuk array langsung atau dibungkus
 * {items:[...]}/{data:[...]}, jadi semua parsing memakai helper di bawah.
 */

/* ================= Stage pipeline kanonis ================= */

export type StageKey =
  | "screening"
  | "assessment"
  | "interview_hr"
  | "interview_tech"
  | "interview_final"
  | "offer"
  | "hired"
  | "rejected";

export const STAGES: { key: StageKey; label: string }[] = [
  { key: "screening", label: "Screening" },
  { key: "assessment", label: "Assessment" },
  { key: "interview_hr", label: "Interview HR" },
  { key: "interview_tech", label: "Interview Teknis" },
  { key: "interview_final", label: "Interview Final" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Ditolak" },
];

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label]),
);

/** Petakan nilai stage dari API (key, label, atau varian penulisan) ke StageKey. */
export function canonicalStageKey(value: unknown): StageKey {
  const raw = String(value ?? "").trim();
  const normalized = raw.toLowerCase().replace(/[-\s]+/g, "_");
  const found = STAGES.find((s) => s.key === normalized);
  if (found) return found.key;
  const byLabel = STAGES.find((s) => s.label.toLowerCase() === raw.toLowerCase());
  if (byLabel) return byLabel.key;
  return "screening";
}

/* ================= Normalisasi respons ================= */

export interface RawRow {
  [key: string]: unknown;
}

export function pickNumber(obj: RawRow, keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

export function pickNumberOrNull(obj: RawRow, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

export function pickString(obj: RawRow, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

/** Terima array langsung atau objek pembungkus {items|data|results|...}. */
export function asRows(raw: unknown): RawRow[] {
  if (Array.isArray(raw)) return raw as RawRow[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["data", "items", "results", "jobs", "applicants"]) {
      if (Array.isArray(r[k])) return r[k] as RawRow[];
    }
  }
  return [];
}

/* ================= Lowongan ================= */

export interface Job {
  id: string;
  title: string;
  status: string;
  department_name: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  employment_type: string;
  applicants_count: number;
}

function pickDepartmentName(raw: RawRow): string {
  const d = raw["department"];
  if (d && typeof d === "object") {
    const name = (d as RawRow)["name"];
    if (typeof name === "string" && name.trim() !== "") return name;
  }
  return pickString(raw, ["department_name", "department"]);
}

export function normalizeJob(raw: RawRow): Job {
  return {
    id: pickString(raw, ["id", "job_id"]),
    title: pickString(raw, ["title", "name"]),
    status: pickString(raw, ["status"]) || "draft",
    department_name: pickDepartmentName(raw),
    location: pickString(raw, ["location", "work_location"]),
    salary_min: pickNumberOrNull(raw, ["salary_min", "min_salary"]),
    salary_max: pickNumberOrNull(raw, ["salary_max", "max_salary"]),
    employment_type: pickString(raw, ["employment_type", "job_type"]),
    applicants_count: pickNumber(raw, ["applicants_count", "total_applicants", "applicant_count"]),
  };
}

/** Detail lowongan: objek langsung atau dibungkus {data|job|item}. */
export function normalizeJobDetail(raw: unknown): Job | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  for (const k of ["data", "job", "item"]) {
    const v = r[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const job = normalizeJob(v as RawRow);
      if (job.id || job.title) return job;
    }
  }
  const job = normalizeJob(r as RawRow);
  return job.id || job.title ? job : null;
}

/* ================= Pelamar & pipeline ================= */

export interface Applicant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  source: string;
  resume_url: string;
  score: number | null;
  stage: StageKey;
}

export function normalizeApplicant(raw: RawRow): Applicant {
  return {
    id: pickString(raw, ["id", "applicant_id"]),
    full_name: pickString(raw, ["full_name", "name", "candidate_name"]),
    email: pickString(raw, ["email"]),
    phone: pickString(raw, ["phone", "phone_number"]),
    source: pickString(raw, ["source"]),
    resume_url: pickString(raw, ["resume_url", "cv_url"]),
    score: pickNumberOrNull(raw, ["score", "assessment_score"]),
    stage: canonicalStageKey(raw["current_stage"] ?? raw["stage"] ?? raw["status"]),
  };
}

export interface StageColumn {
  key: StageKey;
  label: string;
  applicants: Applicant[];
}

/**
 * Normalisasi GET /jobs/{id}/pipeline.
 * - Bentuk kanonis: {stages:[{key|name, applicants:[...]}]}
 * - Bentuk lain: daftar pelamar datar dengan field stage/current_stage.
 * Semua 8 stage kanonis selalu dikembalikan walau kosong.
 */
export function normalizePipeline(raw: unknown): StageColumn[] {
  const columns: StageColumn[] = STAGES.map((s) => ({ key: s.key, label: s.label, applicants: [] }));
  const byKey = new Map<StageKey, StageColumn>(columns.map((c) => [c.key, c]));

  const pushApplicant = (row: RawRow, forcedKey?: StageKey) => {
    const applicant = normalizeApplicant(row);
    const key = forcedKey ?? applicant.stage;
    (byKey.get(key) ?? byKey.get("screening")!).applicants.push(applicant);
  };

  let fromStages = false;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r["stages"])) {
      fromStages = true;
      for (const item of r["stages"]) {
        if (!item || typeof item !== "object") continue;
        const sr = item as RawRow;
        const key = canonicalStageKey(sr["key"] ?? sr["stage"] ?? sr["name"]);
        for (const row of asRows(sr["applicants"])) pushApplicant(row, key);
      }
    }
  }
  if (!fromStages) {
    for (const row of asRows(raw)) pushApplicant(row);
  }
  return columns;
}

/* ================= Interview ================= */

export interface Interview {
  id: string;
  applicant_id: string;
  applicant_name: string;
  scheduled_at: string;
  type: string;
  interviewers: string[];
  status: string;
  notes: string;
}

export function normalizeInterview(raw: RawRow): Interview {
  const rawInterviewers = raw["interviewers"];
  const interviewers = Array.isArray(rawInterviewers)
    ? rawInterviewers.map((v) => String(v)).filter((v) => v.trim() !== "")
    : [];
  return {
    id: pickString(raw, ["id", "interview_id"]),
    applicant_id: pickString(raw, ["applicant_id", "applicant"]),
    applicant_name: pickString(raw, ["applicant_name", "candidate_name", "full_name"]),
    scheduled_at: pickString(raw, ["scheduled_at", "schedule", "datetime", "scheduled_for"]),
    type: pickString(raw, ["type", "interview_type"]),
    interviewers,
    status: pickString(raw, ["status"]) || "scheduled",
    notes: pickString(raw, ["notes", "note"]),
  };
}

/* ================= Label ================= */

export const JOB_STATUS_META: Record<
  string,
  { label: string; variant: "default" | "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  draft: { label: "Draf", variant: "neutral" },
  pending: { label: "Menunggu", variant: "warning" },
  published: { label: "Diterbitkan", variant: "success" },
  closed: { label: "Ditutup", variant: "neutral" },
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  "full-time": "Penuh waktu",
  "part-time": "Paruh waktu",
  contract: "Kontrak",
  internship: "Magang",
};

export const SOURCE_LABELS: Record<string, string> = {
  website: "Situs web",
  referral: "Referensi",
  linkedin: "LinkedIn",
  jobstreet: "Jobstreet",
  other: "Lainnya",
};

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  interview_hr: "Interview HR",
  interview_tech: "Interview teknis",
  interview_final: "Interview final",
};

export const INTERVIEW_STATUS_META: Record<
  string,
  { label: string; variant: "default" | "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  scheduled: { label: "Terjadwal", variant: "info" },
  completed: { label: "Selesai", variant: "success" },
  cancelled: { label: "Dibatalkan", variant: "danger" },
};

/** Class textarea native (tidak ada komponen Textarea di ui/). */
export const TEXTAREA_CLASS =
  "flex min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-base sm:text-sm text-text placeholder:text-text-tertiary";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
