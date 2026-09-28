"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Minus, Plus, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cx } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MAX_ORG_DEPTH, type OrgNode, type OrgNodeRaw } from "./types";

/* ---------------- Bangun tree dari daftar flat ---------------- */

function buildTree(raw: OrgNodeRaw[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  for (const n of raw) {
    map.set(n.id, { ...n, children: [], depth: 0 });
  }
  const roots: OrgNode[] = [];
  for (const node of Array.from(map.values())) {
    const parentId = node.parent_id ?? null;
    const parent = parentId ? map.get(parentId) : undefined;
    if (parent && parent.id !== node.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const assign = (nodes: OrgNode[], depth: number) => {
    for (const n of nodes) {
      n.depth = depth;
      if (depth < MAX_ORG_DEPTH) assign(n.children, depth + 1);
      else n.children = [];
    }
  };
  assign(roots, 0);
  return roots;
}

function collectIds(nodes: OrgNode[], depth: number, acc: Set<string>): Set<string> {
  for (const n of nodes) {
    if (depth <= 2) acc.add(n.id);
    collectIds(n.children, depth + 1, acc);
  }
  return acc;
}

/* ---------------- Node bagan ---------------- */

function OrgCard({
  node,
  expanded,
  onToggle,
  onOpen,
}: {
  node: OrgNode;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const hasChildren = node.children.length > 0;
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Lihat profil ${node.name}`}
          className={cx(
            "flex w-52 flex-col items-center gap-1.5 rounded-card border border-border bg-surface px-4 py-3",
            "shadow-sm transition-all duration-150 hover:border-accent hover:shadow-md",
            "focus-visible:outline-none",
          )}
        >
          <Avatar name={node.name} src={node.photo_url} />
          <span className="w-full truncate text-sm font-semibold text-text">{node.name}</span>
          {node.position && (
            <span className="w-full truncate text-xs text-text-secondary">{node.position}</span>
          )}
          {node.department && (
            <span className="w-full truncate text-[11px] text-text-tertiary">{node.department}</span>
          )}
        </button>
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `Ciutkan bawahan ${node.name}` : `Perluas bawahan ${node.name}`}
            className="absolute -bottom-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-colors hover:bg-muted hover:text-text"
          >
            <ChevronDown
              className={cx("h-4 w-4 transition-transform duration-150", !expanded && "-rotate-90")}
              aria-hidden
            />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <>
          {/* garis vertikal dari induk */}
          <div aria-hidden className="h-5 w-0.5 shrink-0" style={{ background: "var(--border)" }} />
          <div className="relative flex items-start gap-6">
            {/* garis horizontal penghubung */}
            <div
              aria-hidden
              className="absolute top-0 h-0"
              style={{
                left: `calc(50% / ${node.children.length})`,
                right: `calc(50% / ${node.children.length})`,
                borderTop: "2px solid var(--border)",
              }}
            />
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* garis vertikal ke anak */}
                <div aria-hidden className="h-5 w-0.5 shrink-0" style={{ background: "var(--border)" }} />
                <OrgCardNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}

      {hasChildren && !expanded && (
        <span className="tnum mt-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-text-secondary">
          {node.children.length} bawahan
        </span>
      )}
    </div>
  );
}

// Pembungkus rekursif agar state expanded mengalir via context.
const TreeContext = React.createContext<{
  expanded: Set<string>;
  toggle: (id: string) => void;
  openProfile: (id: string) => void;
} | null>(null);

function OrgCardNode({ node }: { node: OrgNode }) {
  const ctx = React.useContext(TreeContext);
  if (!ctx) return null;
  return (
    <OrgCard
      node={node}
      expanded={ctx.expanded.has(node.id)}
      onToggle={() => ctx.toggle(node.id)}
      onOpen={() => ctx.openProfile(node.id)}
    />
  );
}

/* ---------------- Bagan utama ---------------- */

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.15;

export function OrgChart() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<OrgNodeRaw[] | { nodes?: OrgNodeRaw[] }>(() =>
    api.get("/org-chart"),
  );

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [zoom, setZoom] = React.useState(1);

  const raw: OrgNodeRaw[] = React.useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data.nodes ?? []);
  }, [data]);

  const roots = React.useMemo(() => buildTree(raw), [raw]);

  // Buka 3 level teratas saat data pertama dimuat.
  React.useEffect(() => {
    if (roots.length > 0) {
      setExpanded((prev) => (prev.size === 0 ? collectIds(roots, 0, new Set()) : prev));
    }
  }, [roots]);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allIds = React.useCallback((nodes: OrgNode[], acc: string[] = []): string[] => {
    for (const n of nodes) {
      acc.push(n.id);
      allIds(n.children, acc);
    }
    return acc;
  }, []);

  const openProfile = React.useCallback(
    (id: string) => router.push(`/karyawan/${id}`),
    [router],
  );

  const ctx = React.useMemo(
    () => ({ expanded, toggle, openProfile }),
    [expanded, toggle, openProfile],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-label="Memuat bagan organisasi">
        <div className="flex flex-col items-center gap-4">
          <Skeleton shape="block" className="h-24 w-52" />
          <div className="flex gap-6">
            <Skeleton shape="block" className="h-24 w-52" />
            <Skeleton shape="block" className="h-24 w-52" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm font-medium text-text">Gagal memuat bagan organisasi</p>
        <p className="max-w-sm text-[13px] text-text-secondary">{error}</p>
        <Button variant="outline" size="sm" onClick={reload}>
          Muat ulang
        </Button>
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <EmptyState
        title="Belum ada data bagan"
        description="Struktur organisasi akan tampil di sini setelah data atasan-bawahan diisi."
      />
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Kontrol bagan">
        <div className="flex items-center gap-1 rounded-control border border-border bg-surface p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Perkecil bagan"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
          <span className="tnum w-14 text-center text-[13px] text-text-secondary" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Perbesar bagan"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(1)}
            aria-label="Kembalikan ukuran awal"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set(allIds(roots)))}>
          Perluas semua
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())}>
          Ciutkan semua
        </Button>
        <p className="ml-auto text-xs text-text-tertiary">Klik kartu untuk membuka profil karyawan</p>
      </div>

      {/* Area bagan */}
      <Card className="overflow-auto p-6">
        <div className="flex min-w-max justify-center">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            <TreeContext.Provider value={ctx}>
              <div className="flex items-start justify-center gap-6">
                {roots.map((root) => (
                  <OrgCardNode key={root.id} node={root} />
                ))}
              </div>
            </TreeContext.Provider>
          </div>
        </div>
      </Card>
    </div>
  );
}
