"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { DepartmentManager, DeleteHint } from "./_components/DepartmentManager";
import { OrgChart } from "./_components/OrgChart";
import { PositionManager } from "./_components/PositionManager";

const TABS = [
  { value: "bagan", label: "Bagan organisasi" },
  { value: "departemen", label: "Departemen" },
  { value: "jabatan", label: "Jabatan" },
];

export default function OrganisasiPage() {
  const [tab, setTab] = React.useState("bagan");

  return (
    <div>
      <PageHeader
        title="Organisasi"
        description="Struktur organisasi, departemen, dan jabatan perusahaan."
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Organisasi">
        {(value) => (
          <>
            {value === "bagan" && <OrgChart />}
            {value === "departemen" && (
              <>
                <DepartmentManager />
                <DeleteHint />
              </>
            )}
            {value === "jabatan" && <PositionManager />}
          </>
        )}
      </Tabs>
    </div>
  );
}
