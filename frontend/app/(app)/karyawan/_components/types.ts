/** Tipe bersama untuk modul Karyawan. Bentuk mengikuti API_CONTRACT.md. */

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

export interface EmployeeListItem {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department?: NamedRef | null;
  position?: NamedRef | null;
  status: string;
  join_date?: string | null;
  photo_url?: string | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  nik?: string | null;
  npwp?: string | null;
  place_of_birth?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_type?: string | null;
  religion?: string | null;
  marital_status?: string | null;
  address_ktp?: string | null;
  address_domisili?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  probation_end?: string | null;
  employment_status?: string | null;
  employment_type?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  reporting_to?: string | null;
  reporting_to_name?: string | null;
  branch?: string | null;
  base_salary?: number | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_account_name?: string | null;
  bpjs_kesehatan_no?: string | null;
  bpjs_ketenagakerjaan_no?: string | null;
  ptkp_status?: string | null;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string | null;
}

export interface Position {
  id: string;
  title: string;
  code?: string;
  level?: string | null;
}

export interface ImportErrorRow {
  row: number;
  reason: string;
}

export interface ImportResult {
  imported: number;
  errors: ImportErrorRow[];
  total?: number;
}

export interface HistoryEntry {
  id?: string | number;
  created_at?: string | null;
  created_by?: string | null;
  actor_name?: string | null;
  action?: string | null;
  description?: string | null;
  field?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  changes?: Array<{
    field?: string;
    old_value?: unknown;
    new_value?: unknown;
  }> | null;
  [key: string]: unknown;
}
