/** Tipe bersama untuk modul Organisasi. Bentuk mengikuti API_CONTRACT.md. */

export interface OrgNodeRaw {
  id: string;
  name: string;
  position?: string | null;
  department?: string | null;
  photo_url?: string | null;
  parent_id?: string | null;
}

export interface OrgNode extends OrgNodeRaw {
  children: OrgNode[];
  depth: number;
}

export interface DepartmentNode {
  id: string;
  name: string;
  code?: string | null;
  parent_id?: string | null;
  head_id?: string | null;
  head_name?: string | null;
  cost_center?: string | null;
  employee_count?: number | null;
  children?: DepartmentNode[];
}

export interface PositionItem {
  id: string;
  title: string;
  code?: string | null;
  level?: string | null;
  grade?: string | null;
  department_id?: string | null;
  department?: { name?: string } | null;
  min_salary?: number | null;
  max_salary?: number | null;
}

export interface EmployeeOption {
  id: string;
  full_name: string;
}

export const MAX_ORG_DEPTH = 8;
