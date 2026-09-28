# Hashiru HRIS

Sistem Informasi SDM terpadu — rekrutmen → onboarding → absensi → cuti →
penggajian (PPh 21 & BPJS) → reimbursement → offboarding. Dibangun sesuai PRD v1.0.0.

## Arsitektur

```
hris/
├── backend/          FastAPI + SQLAlchemy + JWT + RBAC (81 endpoint)
├── frontend/         Next.js 14 + Tailwind 3.4 + Recharts (17 route)
├── DESIGN.md         Sistem desain (wajib dibaca sebelum ubah UI)
├── API_CONTRACT.md   Kontrak endpoint backend ↔ frontend
└── docker-compose.yml
```

## Cara menjalankan

### Opsi A — Docker (disarankan)

```bash
cd ~/workspace/hris
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- API docs (Swagger): http://localhost:8000/docs

Seed otomatis: database diisi PT Hashiru Teknologi (28 karyawan, 6 akun).

### Opsi B — Manual (tanpa Docker)

```bash
# Backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.services.seed        # sekali saja
.venv/bin/uvicorn app.main:app --port 8000

# Frontend (terminal lain)
cd frontend
npm install
npm run dev                                   # http://localhost:3000
```

Backend memakai SQLite (`./hris.db`) bila `DATABASE_URL` tidak diset;
isi `DATABASE_URL=postgresql+psycopg2://...` untuk Postgres.

## Akun demo

Password semua akun: `Password123!`

| Email | Peran |
|---|---|
| admin@hashiru.id | Super Admin |
| rina@hashiru.id | HR Manager |
| dewi@hashiru.id | Recruiter |
| andi@hashiru.id | Finance Officer |
| budi@hashiru.id | Department Manager |
| sari@hashiru.id | Karyawan (ESS) |

## Modul

Dashboard eksekutif · Karyawan (CRUD + impor CSV/XLSX) · Organisasi (bagan + departemen + jabatan) ·
Absensi (check-in/out + ringkasan tim) · Cuti (saldo + pengajuan + persetujuan bertingkat) ·
Penggajian (kalkulasi PPh 21/BPJS, approval, slip, THR, file bank) · Pengeluaran ·
Rekrutmen (kanban pipeline + interview) · Onboarding/Offboarding · Dokumen · Laporan · Pengaturan.

## Pengujian

```bash
cd backend && .venv/bin/python -m pytest tests/ -q   # 28 test
cd frontend && npm run build                          # typecheck + build
```

## Catatan

- Perhitungan pajak memakai angka referensi PRD (PTKP, tarif progresif, plafon BPJS)
  sebagai konstanta di `backend/app/services/payroll.py` — sesuaikan dengan PMK/PP terbaru
  sebelum dipakai produksi.
- UI berbahasa Indonesia; mendukung dark mode; aksesibilitas (label, focus ring,
  keyboard) mengikuti skill `better-*` dari jakubkrehel/skills.
