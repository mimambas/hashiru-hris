"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

/**
 * Halaman masuk: kartu tengah, email + password, error inline yang jelas,
 * loading state. Token disimpan di localStorage oleh AuthProvider.
 */
export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [demoSubmitting, setDemoSubmitting] = React.useState<string | null>(null);

  const DEMO_ACCOUNTS = [
    { label: "Super Admin", email: "admin@hashiru.id" },
    { label: "HR Manager", email: "rina@hashiru.id" },
    { label: "Recruiter", email: "dewi@hashiru.id" },
    { label: "Finance Officer", email: "andi@hashiru.id" },
    { label: "Department Manager", email: "budi@hashiru.id" },
    { label: "Karyawan", email: "sari@hashiru.id" },
  ];
  const DEMO_PASSWORD = "Password123!";

  async function loginAsDemo(account: { label: string; email: string }) {
    if (demoSubmitting) return;
    setDemoSubmitting(account.email);
    setErrors({});
    try {
      await login(account.email, DEMO_PASSWORD);
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal masuk. Periksa koneksi lalu coba lagi.";
      setErrors({ form: message });
    } finally {
      setDemoSubmitting(null);
    }
  }

  React.useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, user, router]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Masukkan alamat email Anda.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Format email tidak valid, contoh: nama@perusahaan.id.";
    if (!password) next.password = "Masukkan kata sandi Anda.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? "Email atau kata sandi salah. Periksa kembali lalu coba lagi."
          : err instanceof Error
            ? err.message
            : "Gagal masuk. Periksa koneksi lalu coba lagi.";
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-page">
        <p className="text-sm text-text-secondary" role="status">
          Memuat…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-card bg-accent text-white">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-text">Hashiru HRIS</p>
            <p className="mt-1 text-sm text-text-secondary">
              Masuk untuk mengelola sumber daya manusia
            </p>
          </div>
        </div>

        <Card>
          <h1 className="mb-5 text-lg font-semibold text-text">Masuk</h1>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@perusahaan.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="mt-1.5"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1.5 text-[13px] text-danger-text">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Kata sandi</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-text-tertiary hover:bg-muted hover:text-text"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1.5 text-[13px] text-danger-text">
                  {errors.password}
                </p>
              )}
            </div>

            {errors.form && (
              <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-[13px] text-danger-text">
                {errors.form}
              </p>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              Masuk
            </Button>
          </form>
        </Card>

        <section aria-label="Akun demo" className="mt-4 rounded-card bg-accent-soft p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-text">Akun demo</h2>
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-text">
              Demo
            </span>
          </div>
          <p className="mb-3 text-[13px] text-text-secondary">
            Pilih peran untuk masuk langsung tanpa mengetik kata sandi.
          </p>
          <ul className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li
                key={account.email}
                className="flex items-center justify-between gap-3 rounded-control bg-surface px-3.5 py-2.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{account.label}</p>
                  <p className="truncate font-mono text-xs text-text-secondary">{account.email}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  loading={demoSubmitting === account.email}
                  disabled={demoSubmitting !== null && demoSubmitting !== account.email}
                  onClick={() => loginAsDemo(account)}
                  aria-label={`Masuk sebagai ${account.label}`}
                >
                  Masuk
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-4 rounded-card bg-muted px-4 py-3 text-center text-xs leading-relaxed text-text-tertiary">
          Kata sandi demo (<span className="font-mono">{DEMO_PASSWORD}</span>) ditampilkan karena
          ini lingkungan demo.
        </p>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Lupa kata sandi? Hubungi administrator HR perusahaan Anda.
        </p>
      </div>
    </main>
  );
}
