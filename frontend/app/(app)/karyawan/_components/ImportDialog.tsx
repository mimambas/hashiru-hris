"use client";

import * as React from "react";
import { CheckCircle2, FileUp, TriangleAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import type { ImportResult } from "./types";

/**
 * Dialog impor karyawan: upload CSV/XLSX lalu tampilkan laporan
 * hasil per baris (berhasil / gagal + alasan).
 */
export function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setUploading(false);
      setError(null);
      setResult(null);
    }
  }, [open ]);

  async function handleUpload() {
    if (!file) {
      setError("Pilih berkas CSV atau XLSX terlebih dahulu");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<ImportResult>("/employees/import", fd);
      const normalized: ImportResult = {
        imported: res.imported ?? 0,
        errors: res.errors ?? [],
        total: res.total,
      };
      setResult(normalized);
      if (normalized.imported > 0) onImported();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengunggah berkas. Coba lagi.",
      );
    } finally {
      setUploading(false);
    }
  }

  const total = result?.total ?? result ? (result.imported + result.errors.length) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Impor karyawan"
      description="Unggah berkas CSV atau XLSX berisi data karyawan. Baris yang gagal akan dilaporkan beserta alasannya."
    >
      {!result ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="import-file" className="mb-1.5">
              Berkas CSV/XLSX
            </Label>
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="block w-full cursor-pointer rounded-control border border-border bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text hover:file:bg-border"
              aria-describedby="import-file-hint"
            />
            <p id="import-file-hint" className="mt-1 text-xs text-text-tertiary">
              Kolom yang diharapkan: nama lengkap, email, NIK (16 digit), departemen, jabatan, tanggal bergabung.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Batal
            </Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!file}>
              <FileUp className="h-4 w-4" aria-hidden />
              Unggah dan impor
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            role="status"
            className="flex items-start gap-3 rounded-control border border-border bg-muted/50 px-4 py-3"
          >
            {result.errors.length === 0 ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            ) : (
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            )}
            <div className="text-sm">
              <p className="font-medium text-text">
                {result.imported} dari {total} baris berhasil diimpor
              </p>
              <p className="text-text-secondary">
                {result.errors.length === 0
                  ? "Semua baris berhasil diproses."
                  : `${result.errors.length} baris gagal. Perbaiki berkas lalu unggah ulang baris yang gagal.`}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">Baris yang gagal</h3>
              <TableWrapper className="max-h-64 overflow-y-auto rounded-control border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead numeric className="w-16">Baris</TableHead>
                      <TableHead>Alasan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((row) => (
                      <TableRow key={row.row}>
                        <TableCell numeric className="tnum">{row.row}</TableCell>
                        <TableCell>{row.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setResult(null)}>
              Impor berkas lain
            </Button>
            <Button onClick={onClose}>Tutup</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
