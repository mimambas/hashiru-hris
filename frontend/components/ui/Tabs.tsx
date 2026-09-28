"use client";

import * as React from "react";
import { cx } from "@/lib/format";

/** Tabs aksesibel (role tablist/tab/tabpanel, panah kiri/kanan). */
interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  children: (value: string) => React.ReactNode;
  label?: string;
}

function Tabs({ tabs, value, onChange, children, label }: TabsProps) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (next !== null) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
      onChange(tabs[next].value);
    }
  };

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-border">
        {tabs.map((tab, i) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                "relative px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                selected ? "text-accent" : "text-text-secondary hover:text-text",
              )}
            >
              {tab.label}
              {selected && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {children(value)}
      </div>
    </div>
  );
}

export { Tabs };
export type { TabItem };
