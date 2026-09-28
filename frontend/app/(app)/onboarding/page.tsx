"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { OffboardingTab } from "./_components/OffboardingTab";
import { OnboardingTab } from "./_components/OnboardingTab";

const ALLOWED_ROLES: Role[] = [
  "super_admin",
  "hr_director",
  "hr_manager",
  "hr_officer",
  "recruiter",
];

export default function OnboardingPage() {
  const { hasRole } = useAuth();
  const [tab, setTab] = React.useState("onboarding");

  if (!hasRole(...ALLOWED_ROLES)) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" aria-hidden />}
          title="Anda tidak memiliki akses ke modul ini"
          description="Modul onboarding & offboarding hanya tersedia untuk tim HR dan rekrutmen."
        />
      </div>
    );
  }

  return (
    <Tabs
      label="Onboarding dan offboarding"
      tabs={[
        { value: "onboarding", label: "Onboarding" },
        { value: "offboarding", label: "Offboarding" },
      ]}
      value={tab}
      onChange={setTab}
    >
      {(value) => (value === "offboarding" ? <OffboardingTab /> : <OnboardingTab />)}
    </Tabs>
  );
}
