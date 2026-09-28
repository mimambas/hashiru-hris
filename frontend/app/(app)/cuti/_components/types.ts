/** Tipe bersama untuk modul Cuti. Bentuk mengikuti API_CONTRACT.md. */

export interface LeaveBalance {
  leave_type: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveTypeSetting {
  code: string;
  name?: string | null;
  default_days?: number | null;
  description?: string | null;
}

export interface LeaveRequest {
  id: string;
  employee?: {
    id?: string;
    full_name?: string;
    employee_id?: string;
    department?: { name?: string } | null;
    position?: { title?: string } | null;
  } | null;
  employee_id?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days?: number | null;
  reason?: string | null;
  status: string;
  attachment_url?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  approved_by?: string | null;
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
