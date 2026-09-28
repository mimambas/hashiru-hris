/** Tipe bersama untuk modul Pengeluaran. Bentuk mengikuti API_CONTRACT.md (defensif). */

export interface RawRow {
  [key: string]: unknown;
}

export interface ExpenseItem {
  id: string;
  claim_date: string | null;
  type: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  status: string;
  rejection_reason: string | null;
  employee_name: string | null;
  created_at: string | null;
}

/** Opsi tipe klaim (label Indonesia). */
export const EXPENSE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "transport", label: "Transport" },
  { value: "meal", label: "Uang makan" },
  { value: "accommodation", label: "Akomodasi" },
  { value: "communication", label: "Komunikasi" },
  { value: "training", label: "Pelatihan" },
  { value: "other", label: "Lainnya" },
];

export function expenseTypeLabel(type: string | null | undefined): string {
  const found = EXPENSE_TYPE_OPTIONS.find((o) => o.value === (type ?? "").toLowerCase());
  return found ? found.label : (type ?? "—");
}
