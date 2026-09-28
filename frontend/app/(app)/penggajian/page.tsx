"use client";

import * as React from "react";
import { Tabs } from "@/components/ui/Tabs";
import { PeriodeTab } from "./_components/PeriodeTab";
import { SlipTab } from "./_components/SlipTab";
import { ThrTab } from "./_components/ThrTab";

const TABS = [
  { value: "periode", label: "Periode gaji" },
  { value: "slip", label: "Slip saya" },
  { value: "thr", label: "THR" },
];

export default function PenggajianPage() {
  const [tab, setTab] = React.useState("periode");

  return (
    <div className="flex flex-col gap-6">
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Navigasi penggajian">
        {(value) =>
          value === "slip" ? <SlipTab /> : value === "thr" ? <ThrTab /> : <PeriodeTab />
        }
      </Tabs>
    </div>
  );
}
