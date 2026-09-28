# Hashiru HRIS — Backend (FastAPI)

Backend REST API untuk aplikasi HRIS PT Hashiru Teknologi.
Mengimplementasikan seluruh `API_CONTRACT.md` (base path `/api/v1`).

## Teknologi

- FastAPI 0.141 · SQLAlchemy 2.0 · Pydantic v2
- JWT via python-jose, password hashing bcrypt via passlib
- DB: `DATABASE_URL` (default `sqlite:///./hris.db`; kode ditulis portabel ke Postgres —
  UUID sebagai `String(36)`, tipe `JSON` generik, tanpa fungsi SQL spesifik vendor)

## Cara jalan

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# seed database demo (PT Hashiru Teknologi, 28 karyawan, dsb.)
.venv/bin/python -m app.services.seed

# jalankan server
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- Health check: `GET http://127.0.0.1:8000/health`
- Swagger UI: `http://127.0.0.1:8000/docs`
- CORS mengizinkan `http://localhost:3000`

Login seed (password semua: `Password123!`):

| Email | Role |
|---|---|
| admin@hashiru.id | super_admin |
| rina@hashiru.id | hr_manager |
| budi@hashiru.id | dept_manager |
| sari@hashiru.id | employee |
| andi@hashiru.id | finance_officer |
| dewi@hashiru.id | recruiter |

Contoh:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hashiru.id","password":"Password123!"}'
```

## Testing

```bash
.venv/bin/python -m pytest tests/ -q
```

28 test: akurasi PPh 21 (8jt/TK0 → 0; 20jt/K1 → 487.500/bln; 60jt/K3 → 4.725.000/bln),
BPJS + plafon, THR (penuh/pro-rata/<1 bulan), lembur (1,5x/2x/3x), login + RBAC,
cuti overlap ditolak, check-in ganda ditolak, lockout setelah 5x gagal.

## Struktur

```
app/
  main.py            FastAPI app, CORS, 18 router di /api/v1, /health
  core/config.py     settings via env (DATABASE_URL, SECRET_KEY, dsb.)
  core/security.py   bcrypt + JWT access/refresh
  core/deps.py       get_db, get_current_user, require_role, paginate, log_audit
  core/seed_data.py  seed_all() — data demo PT Hashiru Teknologi
  models/__init__.py 18 model SQLAlchemy (User … Setting)
  schemas/__init__.py  skema Pydantic v2 per modul
  api/v1/            auth, users, employees, departments, positions, org,
                     attendance, leave, payroll, expenses, recruitment,
                     onboarding, offboarding, documents, reports,
                     dashboard, settings, audit
  services/payroll.py  ENGINE payroll (Decimal): PPh21 annualizing + PTKP +
                       tarif progresif, BPJS (plafon 12jt / 10.547.400),
                       lembur, THR, run_payroll()
  services/seed.py   CLI: python -m app.services.seed
tests/               test_payroll.py, test_auth_rbac.py, test_leave.py
```

## Catatan implementasi

- PTKP: TK/0 54jt … K/3 72jt; tarif progresif tahunan 0/5/10/15/20/25%.
- PPh21 bulanan = pajak tahunan dari PKP `bruto×12 − PTKP`, dibagi 12.
- BPJS Kesehatan 1%/4% (plafon 12jt); JHT 2%/3,7%; JP 1%/2% (plafon 10.547.400).
- Lembur: 1,5x jam pertama, 2x berikutnya (2x/3x di hari libur); tarif per jam = gaji/173.
- THR = (gaji pokok + tunjangan tetap) × (bulan kerja/12), min. 1 bulan masa kerja.
- Cuti: hitung hari kerja (Senin–Jumat minus libur nasional dari settings),
  tolak overlap, >3 hari kerja butuh persetujuan hr_director kedua.
- Payroll: draft → calculate → approve (hr_manager+) → paid;
  slip hanya bila approved/paid; bank-file CSV per bank.
- RBAC ditegakkan di dependency `require_role`; ESS (`employee`) otomatis
  ter-filter ke `employee_id` miliknya.
