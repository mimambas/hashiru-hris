# Hashiru HRIS — Design System

Sumber kebenaran untuk semua keputusan visual. Dibangun mengikuti skill
`better-*` dari jakubkrehel/skills (tersedia di `~/workspace/skills/`).
Semua subagent WAJIB membaca file ini sebelum menulis komponen UI.

## 1. Bahasa & Suara (better-writing)

- UI berbahasa **Indonesia**. Sentence case untuk semua label ("Tambah karyawan", bukan "Tambah Karyawan").
- Tombol selalu verb-first: "Simpan", "Ajukan cuti", "Setujui", "Tolak", "Unduh slip".
- Error menjelaskan cara pulih, di samping field yang gagal: "Pilih tanggal mulai cuti" bukan "Invalid date".
- Tidak ada "Oops!", tidak ada tanda seru, tidak ada humor di error/destructive action.
- Terminologi konsisten di seluruh app: Karyawan, Absensi, Cuti, Penggajian, Pengeluaran, Rekrutmen, Dokumen, Laporan, Pengaturan.

## 2. Warna (better-colors)

Sistem token semantik, notasi `oklch()`. Komponen hanya boleh memakai token
semantik — tidak ada nilai mentah di komponen.

```css
/* Primitif: satu neutral ramp + satu accent ramp + status ramps */
--zinc-50:  oklch(0.985 0 0);      --zinc-900: oklch(0.21 0 0);
--zinc-100: oklch(0.97 0 0);       --zinc-950: oklch(0.13 0 0);
--zinc-200: oklch(0.92 0 0);
--zinc-300: oklch(0.87 0 0);
--zinc-400: oklch(0.71 0 0);
--zinc-500: oklch(0.55 0 0);
--zinc-600: oklch(0.44 0 0);
--zinc-700: oklch(0.37 0 0);
--zinc-800: oklch(0.27 0 0);

--brand-50:  oklch(0.97 0.02 250);  --brand-600: oklch(0.55 0.16 255);  /* solid utama */
--brand-100: oklch(0.93 0.04 252);  --brand-700: oklch(0.48 0.15 256);  /* hover */
--brand-500: oklch(0.62 0.15 254);

/* Status: green / amber / red / sky — hanya untuk makna status, bukan dekorasi */
```

Token semantik (Tailwind theme extension):

| Token | Light | Dark | Peran |
|---|---|---|---|
| `bg-page` | zinc-50 | zinc-950 | latar halaman |
| `bg-surface` | white | zinc-900 | kartu, panel |
| `bg-muted` | zinc-100 | zinc-800 | area inset / hover netral |
| `border` | zinc-200 | zinc-800 | pembatas struktural |
| `text` | zinc-900 | zinc-50 | teks utama |
| `text-secondary` | zinc-600 | zinc-400 | teks sekunder |
| `text-tertiary` | zinc-500 | zinc-500 | caption, placeholder info |
| `accent` | brand-600 | brand-500 | satu-satunya warna aksen interaktif |
| `accent-hover` | brand-700 | brand-400 | hover aksen |
| `accent-soft` | brand-50 | brand-950-ish | latar lembut aksen |
| `success / warning / danger / info` | ramps masing-masing | — | status saja |

Aturan:
- **Satu warna, satu makna.** Biru brand = interaktif. Hijau = sukses/hadir. Kuning = telat/pending. Merah = absen/destruktif. Biru langit = info/WFH.
- **Satu aksi primer terisi per tampilan.** Tombol primer `bg-accent`; sisanya netral/outline.
- Status tidak pernah hanya warna: selalu ada ikon + teks ("Hadir", "Terlambat", "Menunggu").
- Dark mode via class `.dark` di `<html>`, toggle di header. Transisi warna dimatikan sesaat saat ganti tema.

## 3. Tipografi (better-typography)

- Font: **Inter** via `next/font/google` (400, 500, 600, 700). Satu font untuk semua.
- `-webkit-font-smoothing: antialiased` sekali di root.
- Skala: `12 / 13 / 14 / 16 / 20 / 24 / 30` px. Body 14px, long-form 16px.
- Heading turun mengikuti level: h1 24 semibold → h2 20 → h3 16. `text-wrap: balance` di heading.
- Angka yang berubah (saldo, jam, nominal) memakai `font-variant-numeric: tabular-nums`.
- Nominal rupiah: `Rp 8.500.000` (titik sebagai pemisah ribuan, tanpa desimal bila bulat).
- Input di mobile `16px` (mencegah zoom iOS): `text-base sm:text-sm`.
- Truncation: `line-clamp` / ellipsis + tooltip bila nilai penting disembunyikan.

## 4. Layout & Spacing (better-layout)

- Grup dengan **jarak, bukan garis**: gap dalam grup 8px, antar grup 16px+.
- Sidebar navigasi di desktop (240px), drawer di mobile. Konten max-width konten, bukan full-bleed teks.
- Page header pola: judul (h1) + deskripsi singkat + aksi primer di kanan.
- Kartu: `bg-surface`, `border`, radius 14px, padding 20–24px. Radius dalam = luar − padding (concentric).
- Tabel data: header sticky, zebra dilarang — gunakan hover row; kolom angka rata kanan + tabular-nums.
- Empty state: ilustrasi ikon netral + 1 kalimat + 1 aksi ("Belum ada data cuti. Ajukan cuti pertama Anda.").
- Breakpoint mengikuti konten; uji 360px dan 1440px.

## 5. UI Polish (better-ui)

- Radius: kartu 14px, input/button 10px, badge 999px. Konsisten concentric.
- Shadow hanya untuk elevasi (dropdown, modal, toast). Border untuk struktur.
- Tombol: `scale(0.96)` saat ditekan (150ms). Transisi hanya properti yang berubah.
- Ikon: Lucide, `currentColor`, stroke 1.5px di samping teks regular, 2px di samping semibold. Outline default; fill = aktif.
- Animasi enter: stagger ~100ms hanya untuk entrance yang jarang (page load dashboard). Interaksi frekuensi tinggi: ≤150ms.
- `prefers-reduced-motion`: matikan slide/scale, ganti crossfade opacity.
- Gambar/avatar: outline 1px `oklch(0 0 0 / 0.1)` (light) / `oklch(1 0 0 / 0.1)` (dark).

## 6. Aksesibilitas (better-accessibility)

- Elemen native dulu: `<button>`, `<a>`, `<label>`. Tidak ada `div onClick`.
- Semua input punya `<label>` terlihat. Placeholder bukan label.
- `:focus-visible` ring 2px `accent`, tidak pernah `outline: none` tanpa pengganti.
- Target sentuh ≥ 44px di mobile, ≥ 40px desktop bila memungkinkan; minimum 24px.
- Modal: focus trap, Esc menutup, fokus kembali ke trigger.
- Toast sukses: `role="status"`; error: `role="alert"`.
- Skip link "Lewati ke konten" sebagai elemen focusable pertama.
- Kontras teks: ukur pasangan yang dirender (target WCAG AA 4.5:1 body, 3:1 teks besar).

## 7. Pola komponen bersama

`components/ui/`: Button, Input, Label, Select, Card, Badge, Table, Dialog,
DropdownMenu, Tabs, Avatar, Tooltip, Toast (sonner-style sederhana), Skeleton,
EmptyState, PageHeader, StatCard, StatusDot.

Form: label di atas input, error di bawah field, tombol submit verb-first,
nonaktifkan + spinner saat submit, fokus ke field pertama yang invalid.

## 8. Struktur route (App Router)

```
/login
/(app)/dashboard            Ringkasan eksekutif + widget ESS
/(app)/karyawan             Daftar, tambah, impor, detail (tab)
/(app)/organisasi           Org chart + departemen + jabatan
/(app)/absensi              Check-in/out, riwayat, ringkasan tim
/(app)/cuti                 Pengajuan, saldo, persetujuan
/(app)/penggajian           Periode, kalkulasi, approval, slip, THR
/(app)/pengeluaran          Klaim + persetujuan
/(app)/rekrutmen            Lowongan + kanban pipeline + interview
/(app)/onboarding           Checklist per karyawan baru
/(app)/dokumen              Repositori dokumen
/(app)/laporan              11 laporan standar
/(app)/pengaturan           Perusahaan, aturan absensi, tipe cuti, peran
```

Navigasi sidebar dikelompokkan: **Utama** (Dashboard), **SDM** (Karyawan,
Organisasi, Absensi, Cuti), **Keuangan** (Penggajian, Pengeluaran),
**Talenta** (Rekrutmen, Onboarding), **Lainnya** (Dokumen, Laporan, Pengaturan).
Akses menu disaringตาม peran (RBAC) dari `/auth/me`.
