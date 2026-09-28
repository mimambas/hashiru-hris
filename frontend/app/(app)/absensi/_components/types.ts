/** Tipe bersama untuk modul Absensi. Bentuk mengikuti API_CONTRACT.md. */

export interface AttendanceRecord {
  id?: string | number;
  date?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
  late_minutes?: number | null;
  overtime_hours?: number | null;
  source?: string | null;
  employee?: {
    id?: string;
    full_name?: string;
    employee_id?: string;
    photo_url?: string | null;
  } | null;
}

export interface TodayAttendance {
  id?: string | number;
  date?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
  late_minutes?: number | null;
  overtime_hours?: number | null;
}

export interface TeamMember {
  employee: {
    id: string;
    full_name: string;
    employee_id?: string;
    photo_url?: string | null;
  };
  /** status per tanggal "YYYY-MM-DD" */
  days: Record<string, string | null>;
}

export interface EmployeeOption {
  id: string;
  full_name: string;
}
