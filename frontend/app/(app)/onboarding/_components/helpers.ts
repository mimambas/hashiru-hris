/** Normalisasi defensif untuk respons onboarding/offboarding (pola dashboard). */
import type {
  ChecklistTask,
  EmployeeOption,
  OffboardingData,
  OnboardingData,
} from "./types";

export interface RawRow {
  [key: string]: unknown;
}

export function asRows(raw: unknown): RawRow[] {
  if (Array.isArray(raw)) return raw as RawRow[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["data", "items", "results", "tasks", "checklist"]) {
      if (Array.isArray(r[k])) return r[k] as RawRow[];
    }
  }
  return [];
}

export function pickString(obj: RawRow, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

export function pickNumber(obj: RawRow, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
      return Number(v);
  }
  return null;
}

/* ---------------- Status tugas ---------------- */

const DONE_STATUS = new Set([
  "done",
  "completed",
  "complete",
  "finished",
  "selesai",
  "approved",
  "verified",
]);

export function isTaskDone(task: ChecklistTask): boolean {
  const status = String(task.status ?? "").trim().toLowerCase();
  if (DONE_STATUS.has(status)) return true;
  const completed = task["completed"];
  if (typeof completed === "boolean") return completed;
  return false;
}

export function taskTitle(task: ChecklistTask): string {
  return (
    pickString(task as RawRow, ["title", "name", "task", "label"]) ||
    `Tugas ${task.id}`
  );
}

export function taskAssignee(task: ChecklistTask): string {
  const a = task["assignee"];
  if (a && typeof a === "object") {
    const o = a as Record<string, unknown>;
    const name = o["full_name"] ?? o["name"];
    if (typeof name === "string" && name.trim()) return name;
  }
  return pickString(task as RawRow, [
    "assignee",
    "assignee_name",
    "pic",
    "owner",
    "owner_name",
  ]);
}

export function taskDueDate(task: ChecklistTask): string {
  return pickString(task as RawRow, ["due_date", "dueDate", "deadline", "date"]);
}

/* ---------------- Karyawan ---------------- */

export function departmentName(emp: EmployeeOption): string {
  const d = emp.department;
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.name ?? d.title ?? "";
}

/**
 * Prioritaskan karyawan yang baru bergabung (join_date ≤ 90 hari terakhir)
 * dan berstatus aktif. Bila field tidak tersedia, tampilkan semua.
 */
export function candidateEmployees(list: EmployeeOption[]): EmployeeOption[] {
  let pool = list;
  const hasStatus = list.some((e) => !!e.status);
  if (hasStatus) {
    const active = pool.filter((e) =>
      ["active", "aktif"].includes(String(e.status).trim().toLowerCase()),
    );
    if (active.length > 0) pool = active;
  }
  const hasJoinDate = pool.some((e) => !!e.join_date);
  if (hasJoinDate) {
    const cutoff = Date.now() - 90 * 86_400_000;
    const recent = pool.filter((e) => {
      if (!e.join_date) return false;
      const t = new Date(e.join_date).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
    if (recent.length > 0) pool = recent;
  }
  return [...pool].sort((a, b) =>
    String(b.join_date ?? "").localeCompare(String(a.join_date ?? "")),
  );
}

export function employeeLabel(emp: EmployeeOption): string {
  const dept = departmentName(emp);
  return dept ? `${emp.full_name} — ${dept}` : emp.full_name;
}

/* ---------------- Onboarding ---------------- */

export function normalizeOnboarding(raw: unknown): OnboardingData {
  const rows = asRows(raw);
  const tasks: ChecklistTask[] = rows.map((r, i) => ({
    id: (r["id"] as string | number) ?? i,
    title: pickString(r, ["title", "name", "task", "label"]) || `Tugas ${i + 1}`,
    assignee: taskAssigneeFromRow(r),
    due_date: pickString(r, ["due_date", "dueDate", "deadline"]) || null,
    status: pickString(r, ["status", "state"]) || null,
    group: pickString(r, ["group", "phase", "category", "section"]) || null,
    ...r,
  }));
  let progress = 0;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const pct = pickNumber(raw as RawRow, ["progress_pct", "progress", "progressPercent"]);
    if (pct !== null) progress = pct;
  }
  if (progress === 0 && tasks.length > 0) {
    const done = tasks.filter(isTaskDone).length;
    progress = Math.round((done / tasks.length) * 100);
  }
  return { tasks, progress_pct: Math.min(100, Math.max(0, progress)) };
}

function taskAssigneeFromRow(r: RawRow): string | null {
  const a = r["assignee"];
  if (a && typeof a === "object") {
    const o = a as Record<string, unknown>;
    const name = o["full_name"] ?? o["name"];
    if (typeof name === "string" && name.trim()) return name;
    return null;
  }
  return pickString(r, ["assignee", "assignee_name", "pic", "owner_name"]) || null;
}

/** Urutan kelompok tanggal standar; kelompok kustom menyusul di akhir. */
const GROUP_ORDER = ["Sebelum hari-H", "Hari 1", "Minggu 1", "Bulan 1", "Lainnya"];

export function groupOrder(name: string): number {
  const i = GROUP_ORDER.indexOf(name);
  return i === -1 ? GROUP_ORDER.length : i;
}

/**
 * Kelompokkan tugas: pakai field group/phase/category bila ada, bila tidak
 * hitung dari due_date dibanding join_date karyawan.
 */
export function taskGroup(task: ChecklistTask, joinDate: string | null): string {
  if (task.group) return task.group;
  const due = task.due_date ? new Date(task.due_date) : null;
  if (!due || Number.isNaN(due.getTime()) || !joinDate) return "Lainnya";
  const join = new Date(joinDate);
  if (Number.isNaN(join.getTime())) return "Lainnya";
  const day = 86_400_000;
  const dueDay = Math.floor(due.getTime() / day);
  const joinDay = Math.floor(join.getTime() / day);
  if (dueDay < joinDay) return "Sebelum hari-H";
  if (dueDay === joinDay) return "Hari 1";
  if (dueDay - joinDay <= 7) return "Minggu 1";
  return "Bulan 1";
}

/* ---------------- Offboarding ---------------- */

const TASK_LIST_KEYS = [
  "clearance_tasks",
  "clearance",
  "clearance_checklist",
  "tasks",
  "checklist",
];

const SETTLEMENT_KEYS = ["final_settlement", "settlement", "payout", "finalSettlement"];

const FINISHED_STATUS = new Set(["completed", "done", "finished", "selesai", "closed"]);

export function normalizeOffboarding(raw: unknown): OffboardingData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  let taskRows: RawRow[] = [];
  for (const k of TASK_LIST_KEYS) {
    if (Array.isArray(r[k]) && (r[k] as unknown[]).length > 0) {
      taskRows = r[k] as RawRow[];
      break;
    }
  }
  if (taskRows.length === 0) taskRows = asRows(r);

  const tasks: ChecklistTask[] = taskRows
    .filter((row) => typeof row === "object")
    .map((row, i) => ({
      id: (row["id"] as string | number) ?? i,
      title: pickString(row, ["title", "name", "task", "label"]) || `Tugas ${i + 1}`,
      assignee: taskAssigneeFromRow(row),
      due_date: pickString(row, ["due_date", "dueDate", "deadline"]) || null,
      status: pickString(row, ["status", "state"]) || null,
      ...row,
    }));

  let settlement: Record<string, unknown> | null = null;
  for (const k of SETTLEMENT_KEYS) {
    const v = r[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      settlement = v as Record<string, unknown>;
      break;
    }
  }

  const status = pickString(r, ["status", "state"]) || null;
  const allDone = tasks.length > 0 && tasks.every(isTaskDone);
  const finished =
    (status ? FINISHED_STATUS.has(status.trim().toLowerCase()) : false) || allDone;

  return { tasks, settlement, status, finished };
}

/** Baris rincian final settlement (label Indonesia + nilai). */
export function settlementRows(
  settlement: Record<string, unknown> | null,
): { label: string; value: number | null; strong?: boolean }[] {
  if (!settlement) return [];
  const used = new Set<string>();
  const rows: { label: string; value: number | null; strong?: boolean }[] = [];

  const defs: { label: string; match: RegExp; strong?: boolean }[] = [
    { label: "Gaji pro-rata", match: /prorat/i },
    { label: "Kompensasi cuti", match: /(kompensasi|compensation).*(cuti|leave)|(cuti|leave).*(kompensasi|compensation|uang|pengganti)/i },
    { label: "Potongan", match: /(deduct|potong|pengurang)/i },
    { label: "Total", match: /(^|_)(total|net|bersih)($|_)/i, strong: true },
  ];

  const numericKeys = Object.entries(settlement).filter(
    ([, v]) => typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))),
  );

  for (const def of defs) {
    const hit = numericKeys.find(
      ([k]) => !used.has(k) && def.match.test(k),
    );
    if (hit) {
      used.add(hit[0]);
      rows.push({ label: def.label, value: Number(hit[1]), strong: def.strong });
    }
  }
  // Sisa kunci numerik (bukan id/tanggal) sebagai rincian tambahan.
  for (const [k, v] of numericKeys) {
    if (used.has(k)) continue;
    if (/(^|_)(id|date|at|tanggal)($|_)/i.test(k)) continue;
    used.add(k);
    rows.push({ label: prettifyKey(k), value: Number(v) });
    if (rows.length >= 8) break;
  }
  return rows;
}

export function prettifyKey(key: string): string {
  const s = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
