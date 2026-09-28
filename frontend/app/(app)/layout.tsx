"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  ChartColumn,
  Clock,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Receipt,
  Search,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { cx } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/* ---------------- Navigasi (DESIGN.md §8), disaring berdasarkan peran ---------------- */

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[] | "all";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL: "all" = "all";
const HR: Role[] = ["super_admin", "hr_director", "hr_manager", "hr_officer"];

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Utama",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL }],
  },
  {
    title: "SDM",
    items: [
      { label: "Karyawan", href: "/karyawan", icon: Users, roles: HR },
      { label: "Organisasi", href: "/organisasi", icon: Network, roles: HR },
      { label: "Absensi", href: "/absensi", icon: Clock, roles: ALL },
      { label: "Cuti", href: "/cuti", icon: CalendarDays, roles: ALL },
    ],
  },
  {
    title: "Keuangan",
    items: [
      {
        label: "Penggajian",
        href: "/penggajian",
        icon: Banknote,
        roles: ["super_admin", "hr_director", "hr_manager", "hr_officer", "finance_officer"],
      },
      { label: "Pengeluaran", href: "/pengeluaran", icon: Receipt, roles: ALL },
    ],
  },
  {
    title: "Talenta",
    items: [
      {
        label: "Rekrutmen",
        href: "/rekrutmen",
        icon: Briefcase,
        roles: ["super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter"],
      },
      {
        label: "Onboarding",
        href: "/onboarding",
        icon: UserRound,
        roles: ["super_admin", "hr_director", "hr_manager", "hr_officer", "recruiter"],
      },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { label: "Dokumen", href: "/dokumen", icon: FolderOpen, roles: ALL },
      {
        label: "Laporan",
        href: "/laporan",
        icon: ChartColumn,
        roles: ["super_admin", "hr_director", "hr_manager", "hr_officer", "finance_officer"],
      },
      {
        label: "Pengaturan",
        href: "/pengaturan",
        icon: Settings,
        roles: ["super_admin", "hr_director", "hr_manager"],
      },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  hr_director: "Direktur HR",
  hr_manager: "Manajer HR",
  hr_officer: "Staf HR",
  recruiter: "Rekruter",
  finance_officer: "Staf keuangan",
  dept_manager: "Manajer departemen",
  team_leader: "Ketua tim",
  employee: "Karyawan",
};

function visibleGroups(role: Role | null): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles === ALL || (i.roles as Role[]).includes(role)),
  })).filter((g) => g.items.length > 0);
}

/* ---------------- Guard autentikasi ---------------- */

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page" role="status" aria-label="Memuat">
        <div className="w-full max-w-sm space-y-3 px-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/* ---------------- Sidebar ---------------- */

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = visibleGroups(role);

  return (
    <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.title} className="mb-5 last:mb-0">
          <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium",
                      "transition-colors duration-150",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-text-secondary hover:bg-muted hover:text-text",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.5} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ---------------- Pencarian global sederhana ---------------- */

function GlobalSearch({ role }: { role: Role }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const items = React.useMemo(
    () =>
      visibleGroups(role)
        .flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))),
    [role],
  );

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 7);
  }, [query, items]);

  React.useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-label="Cari menu"
          aria-controls="global-search-results"
          placeholder="Cari menu…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
            } else if (e.key === "Enter" && matches.length > 0) {
              e.preventDefault();
              go(matches[0].href);
            }
          }}
          className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-8 text-base text-text placeholder:text-text-tertiary sm:text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Hapus pencarian"
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-text-tertiary hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {open && query.trim() && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Hasil pencarian menu"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-control border border-border bg-surface py-1 shadow-lg animate-fade-slide-in"
        >
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">
              Tidak ada menu yang cocok dengan “{query.trim()}”.
            </p>
          ) : (
            matches.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.href}
                  role="option"
                  aria-selected={false}
                  onClick={() => go(m.href)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-text transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-text-tertiary" aria-hidden />
                  <span>{m.label}</span>
                  <span className="ml-auto text-xs text-text-tertiary">{m.group}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Shell ---------------- */

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const role = user?.role ?? "employee";
  const displayName = user?.employee?.full_name ?? user?.email ?? "Pengguna";

  React.useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const sidebarBody = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent text-white">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-text">Hashiru HRIS</p>
          <p className="text-xs text-text-tertiary">{ROLE_LABEL[role]}</p>
        </div>
      </div>
      <SidebarNav role={role} onNavigate={() => setDrawerOpen(false)} />
    </>
  );

  return (
    <div className="flex min-h-dvh bg-page">
      {/* Skip link — elemen focusable pertama */}
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Lewati ke konten
      </a>

      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {sidebarBody}
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        ref={(el) => {
          // Saat drawer tertutup, keluarkan dari urutan tab & pembaca layar.
          if (el) (el as HTMLElement).toggleAttribute("inert", !drawerOpen);
        }}
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-surface shadow-xl",
          "transition-transform duration-200 ease-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Menu navigasi"
      >
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Tutup menu"
          className="absolute right-2 top-3 flex h-9 w-9 items-center justify-center rounded-control text-text-secondary hover:bg-muted"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {sidebarBody}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-page/90 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>

            <GlobalSearch role={role} />

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <DropdownMenu
                label="Menu pengguna"
                trigger={
                  <button
                    aria-label={`Menu pengguna, ${displayName}`}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 rounded-control p-1.5 transition-colors hover:bg-muted"
                  >
                    <Avatar
                      name={displayName}
                      src={user?.employee?.photo_url}
                      size="sm"
                    />
                    <span className="hidden max-w-32 truncate text-left text-sm font-medium text-text xl:block">
                      {displayName}
                    </span>
                  </button>
                }
              >
                <div className="border-b border-border px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-text">{displayName}</p>
                  <p className="truncate text-xs text-text-secondary">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={() => (window.location.href = "/pengaturan")}>
                  <Settings className="h-4 w-4" aria-hidden />
                  Pengaturan akun
                </DropdownMenuItem>
                <DropdownMenuItem danger onClick={logout}>
                  <LogOut className="h-4 w-4" aria-hidden />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Konten */}
        <main id="konten" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}
