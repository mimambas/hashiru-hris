/** Tipe bersama untuk modul Onboarding & Offboarding. Bentuk mengikuti API_CONTRACT.md. */

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface NamedRef {
  id?: string;
  name?: string;
  title?: string;
  code?: string;
}

export interface EmployeeOption {
  id: string;
  full_name: string;
  join_date?: string | null;
  status?: string | null;
  department?: NamedRef | string | null;
  position?: NamedRef | string | null;
  [key: string]: unknown;
}

/** Satu tugas checklist (onboarding maupun offboarding). */
export interface ChecklistTask {
  id: string | number;
  title: string;
  assignee?: string | null;
  due_date?: string | null;
  status?: string | null;
  group?: string | null;
  phase?: string | null;
  category?: string | null;
  [key: string]: unknown;
}

export interface OnboardingData {
  tasks: ChecklistTask[];
  progress_pct: number;
}

export interface OffboardingData {
  tasks: ChecklistTask[];
  settlement: Record<string, unknown> | null;
  status: string | null;
  /** true bila seluruh tugas selesai ATAU status backend menandakan selesai. */
  finished: boolean;
}
