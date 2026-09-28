"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const RECRUITMENT_ROLES: Role[] = [
  "super_admin",
  "hr_director",
  "hr_manager",
  "hr_officer",
  "recruiter",
];

/** Batasi modul rekrutmen ke peran HR/rekruter. */
function AccessGuard({ children }: { children: React.ReactNode }) {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return <Skeleton className="h-64 w-full" aria-label="Memuat akses" />;
  }

  if (!hasRole(...RECRUITMENT_ROLES)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" aria-hidden />}
        title="Anda tidak memiliki akses ke modul ini."
        description="Halaman rekrutmen hanya tersedia untuk peran HR dan rekruter."
      />
    );
  }

  return <>{children}</>;
}

export { AccessGuard };
