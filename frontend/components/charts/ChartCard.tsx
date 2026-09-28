"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Cangkang kartu grafik: loading → skeleton, error → pesan + tombol muat ulang,
 * kosong → empty state. Grafik selalu dirender dengan angka tabular-nums.
 */
function ChartCard({
  title,
  description,
  loading,
  error,
  onRetry,
  empty,
  emptyMessage = "Belum ada data untuk ditampilkan.",
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="mb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {loading ? (
        <div className="h-64" aria-label="Memuat grafik">
          <Skeleton className="h-full w-full" />
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-text">Grafik gagal dimuat</p>
          <p className="max-w-xs text-[13px] text-text-secondary">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
              Muat ulang
            </Button>
          )}
        </div>
      ) : empty ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" aria-hidden />}
          title="Belum ada data"
          description={emptyMessage}
          className="py-8"
        />
      ) : (
        <div className="h-64">{children}</div>
      )}
    </Card>
  );
}

export { ChartCard };
