/** Tipe bersama untuk modul Dokumen. Bentuk mengikuti API_CONTRACT.md (defensif). */

export interface RawRow {
  [key: string]: unknown;
}

export interface DocumentItem {
  id: string;
  name: string;
  employee_name: string | null;
  category: string;
  file_ext: string | null;
  expiry_date: string | null;
  verified: boolean;
  file_url: string | null;
}

export interface EmployeeOption {
  id: string;
  full_name: string;
}

export const DOCUMENT_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "personal", label: "Personal" },
  { value: "employment", label: "Kepegawaian" },
  { value: "company", label: "Perusahaan" },
];

export function documentCategoryLabel(category: string | null | undefined): string {
  const found = DOCUMENT_CATEGORY_OPTIONS.find((o) => o.value === (category ?? "").toLowerCase());
  return found ? found.label : (category ?? "—");
}

/** Peran HR yang boleh memverifikasi dokumen & memilih karyawan saat unggah. */
export const HR_ROLES = ["super_admin", "hr_director", "hr_manager", "hr_officer"] as const;
