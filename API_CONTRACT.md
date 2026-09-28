# Hashiru HRIS — API Contract (v1)

Base URL: `http://localhost:8000/api/v1` (dev) · Format: JSON · Auth: `Authorization: Bearer <access_token>`
Pagination: `?page=1&per_page=20` → `{ items: [...], total, page, per_page, pages }`
Error: `{ "detail": "pesan", "code": "ERROR_CODE" }` · Tanggal: ISO 8601.

## Auth

```
POST /auth/login                 { email, password } → { access_token, refresh_token, token_type }
POST /auth/refresh               { refresh_token } → { access_token }
POST /auth/logout                → { ok: true }
GET  /auth/me                    → { id, email, role, employee: {...} | null }
```

Roles: `super_admin, hr_director, hr_manager, hr_officer, recruiter,
finance_officer, dept_manager, team_leader, employee`.
Seed: `admin@hashiru.id` (super_admin), `rina@hashiru.id` (hr_manager),
`budi@hashiru.id` (dept_manager), `sari@hashiru.id` (employee),
`andi@hashiru.id` (finance_officer), `dewi@hashiru.id` (recruiter).
Password seed: `Password123!`.

## Karyawan — /employees

```
GET    /employees?q=&department_id=&status=&page=         daftar (id, employee_id, full_name, email, phone, department{name}, position{title}, status, join_date, photo_url)
POST   /employees                                         buat (validasi NIK 16 digit unik, NPWP unik; employee_id auto EMP-YYYYMMDD-XXX)
GET    /employees/{id}                                    detail lengkap + employment history
PUT    /employees/{id}                                    update (ESS: hanya field self-edit; sensitif → butuh HR)
DELETE /employees/{id}                                   soft delete → status inactive (super_admin/hr_manager)
POST   /employees/import                                  multipart CSV/XLSX → { imported, errors: [{row, reason}] }
GET    /employees/{id}/history                            timeline perubahan (audit)
GET    /employees/{id}/export                             PDF ringkasan (opsional v1: JSON)
```

Employee fields: full_name*, nik, npwp, place_of_birth, date_of_birth, gender,
blood_type, religion, marital_status, phone, email*, address_ktp,
address_domisili, emergency_contact_{name,phone,relation}, join_date*,
contract_start, contract_end, probation_end, employment_status
(contract/permanent/outsourcing), employment_type, department_id, position_id,
reporting_to, branch, base_salary, bank_{name,account,account_name},
bpjs_kesehatan_no, bpjs_ketenagakerjaan_no, ptkp_status (TK/0..K/3), status.

## Organisasi

```
GET/POST            /departments        { name*, code*, parent_id, head_id, cost_center }
GET/PUT/DELETE      /departments/{id}   (hapus ditolak bila ada karyawan aktif)
GET                 /departments/tree   hierarki nested
GET/POST            /positions          { title*, code*, level, grade, department_id, min_salary, max_salary }
GET/PUT/DELETE      /positions/{id}
GET                 /org-chart          { nodes: [{id, name, position, department, photo_url, parent_id}] }
```

## Absensi — /attendance

```
GET  /attendance?employee_id=&from=&to=&status=     riwayat (check_in, check_out, status, late_minutes, overtime_hours, source)
POST /attendance/check-in                            { latitude?, longitude? } → record hari ini
POST /attendance/check-out                           → tutup record hari ini
GET  /attendance/today                               status absensi hari ini utk user login
POST /attendance/manual        (hr_officer+)         { employee_id, date, check_in, check_out, reason } → flagged manual
GET  /attendance/team?from=&to=                      ringkasan tim (manager): [{employee, date: status}]
GET  /settings/attendance      PUT (hr_manager)      { grace_period_minutes, work_start, work_end, overtime_min_minutes, max_overtime_hours }
```

Status: `present, late, early_leave, absent, wfh, leave, holiday`.

## Cuti — /leave-requests, /leave-balances

```
GET  /leave-requests?status=&employee_id=    antrean (manager: timnya; hr: semua)
POST /leave-requests                          { leave_type*, start_date*, end_date*, reason, attachment_url? }
GET  /leave-requests/{id}
PUT  /leave-requests/{id}/approve             (manager/HR; >3 hari kerja → butuh hr_director kedua)
PUT  /leave-requests/{id}/reject              { reason* }
GET  /leave-balances/me                       [{ leave_type, year, total_days, used_days, remaining_days }]
GET  /leave-balances/{employee_id}            (manager/HR)
GET  /settings/leave-types    PUT (hr_manager) daftar tipe + jatah
```

Tipe: AL, SL, PL, ML, PT, BL, MR, HJ, UL, CB. SL > 2 hari wajib lampiran.

## Penggajian — /payroll

```
GET  /payroll/runs?year=                          [{ id, period, status, total_employees, total_gross, total_net }]
POST /payroll/runs                 { period: "YYYY-MM" } → run status draft
POST /payroll/runs/{id}/calculate                 kalkulasi semua item (sync utk v1; ≤30s/1000 org)
GET  /payroll/runs/{id}                           detail + items per karyawan
PUT  /payroll/runs/{id}/approve    (hr_manager+)  { approve: true } / reject { comment }
GET  /payroll/payslip?period=YYYY-MM              slip milik user login (hanya bila run approved/paid)
GET  /payroll/runs/{id}/bank-file?bank=BCA        CSV transfer (nama, rekening, nominal, referensi)
POST /payroll/thr                  { period, hijri_event_date }  run THR terpisah
GET  /payroll/runs/{id}/export?format=xlsx        rekap payroll
```

Item kalkulasi: base_salary, fixed_allowances, overtime_pay (1.5x/2x/3x),
bonus, commission, total_earnings; bpjs_kesehatan (1% emp / 4% co),
bpjs_jht (2% / 3.7%), bpjs_jp (1% / 2%, plafon), pph21 (annualizing +
PTKP + tarif progresif), other_deductions, total_deductions, net_pay.

## Pengeluaran — /expenses

```
GET  /expenses?status=            (karyawan: miliknya; manager: tim; finance: semua)
POST /expenses                    { claim_date*, type*, amount*, description, receipt_url }
PUT  /expenses/{id}/approve       (>5jt → butuh hr_director)
PUT  /expenses/{id}/reject        { reason* }
```

Tipe: transport, meal, accommodation, communication, training, other.

## Rekrutmen — /jobs, /applicants

```
GET/POST          /jobs                    { title*, department_id, location, description, requirements, salary_min, salary_max, employment_type, status }
GET/PUT/DELETE    /jobs/{id}               publish: status draft→pending→published→closed
GET/POST          /jobs/{id}/applicants    { full_name*, email, phone, resume_url, cover_letter, source }
GET/PUT           /applicants/{id}         { current_stage, status, notes, score }
PUT               /applicants/{id}/stage   { stage }   (kanban drag-drop)
POST              /interviews              { applicant_id, scheduled_at, interviewers[], type, notes }
GET               /jobs/{id}/pipeline      { stages: [{ name, applicants: [...] }] }
```

Stages: screening → assessment → interview_hr → interview_tech → interview_final → offer → hired / rejected.

## Onboarding / Offboarding

```
GET /onboarding/{employee_id}                 { tasks: [{id, title, assignee, due_date, status}], progress_pct }
PUT /onboarding/tasks/{task_id}/complete
POST /onboarding/{employee_id}/generate       dari template per departemen
POST /offboarding                             { employee_id, last_date, type: resign/terminate, reason }
GET  /offboarding/{employee_id}               clearance checklist + final settlement
PUT  /offboarding/tasks/{task_id}/complete
```

## Dokumen — /documents

```
GET  /documents?employee_id=&category=&q=      (karyawan: hanya miliknya)
POST /documents/upload                        multipart { employee_id, category, name, file } → simpan lokal ./uploads
GET  /documents/{id}/download                 file stream
PUT  /documents/{id}/verify                   (HR) tandai terverifikasi
DELETE /documents/{id}
```

Kategori: personal, employment, company. Tipe: pdf/jpg/png/docx ≤10MB.

## Laporan — /reports

```
GET /reports/headcount?from=&to=&format=json|xlsx
GET /reports/turnover?from=&to=
GET /reports/attendance?from=&to=&department_id=
GET /reports/leave?year=
GET /reports/overtime?from=&to=
GET /reports/payroll?period=
GET /reports/pph21?period=
GET /reports/bpjs?period=
GET /reports/new-hires?from=&to=
GET /reports/exits?from=&to=
```

## Dashboard & Pengaturan

```
GET /dashboard/kpis            { headcount, new_hires_mtd, turnover_mtd, payroll_mtd, attendance_rate_today }
GET /dashboard/charts/headcount-trend?months=12
GET /dashboard/charts/department-distribution
GET /dashboard/charts/payroll-by-department?period=
GET /dashboard/charts/leave-by-type?year=
GET /dashboard/alerts          kontrak/probation berakhir ≤30 hari, ulang tahun bulan ini
GET /settings/company    PUT   { name, address, ... }
GET /audit-logs?entity_type=&entity_id=       (hr_manager+)
```

## RBAC ringkas

| Role | Akses |
|---|---|
| super_admin | semua |
| hr_director | semua + approve cuti >3 hari, expense >5jt |
| hr_manager | CRUD karyawan/org/absensi/cuti/payroll-run, approve payroll |
| hr_officer | CRUD karyawan, input absensi manual, proses payroll |
| recruiter | modul rekrutmen + onboarding |
| finance_officer | payroll read, bank-file, expense read/approve-finance |
| dept_manager | timnya: absensi, cuti approve, expense approve |
| team_leader | cuti approve tim kecil |
| employee | ESS: profil sendiri, absensi sendiri, cuti, slip, expense |

Catatan: otorisasi ditegakkan di dependency backend (`require_role`,
`scope_employee`), bukan hanya di UI.
