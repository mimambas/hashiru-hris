"use client";

import * as React from "react";
import { BadgeCheck, Download, FileText, Loader2, Search, Trash2, Upload } from "lucide-react";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import { DeleteDialog } from "./_components/DeleteDialog";
import { UploadDialog } from "./_components/UploadDialog";
import {
  asRows,
  ErrorBlock,
  ExpiryBadge,
  expiryState,
  normalizeDocument,
  VerificationBadge,
} from "./_components/helpers";
import { DOCUMENT_CATEGORY_OPTIONS, HR_ROLES, type DocumentItem } from "./_components/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export default function DokumenPage() {
  const { hasRole } = useAuth();
  const isHr = hasRole(...HR_ROLES);

  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [category, setCategory] = React.useState("semua");

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentItem | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Debounce sederhana: kirim q ke API 400ms setelah pengguna berhenti mengetik.
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const docs = useApi(
    () =>
      api.get<unknown>("/documents", {
        query: {
          q: debouncedQ || undefined,
          category: category !== "semua" ? category : undefined,
        },
      }),
    [debouncedQ, category],
  );
  const items = React.useMemo(() => asRows(docs.data).map(normalizeDocument), [docs.data]);

  async function handleDownload(doc: DocumentItem) {
    setDownloadingId(doc.id);
    setActionError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/documents/${doc.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? "File tidak ditemukan." : "Gagal mengunduh dokumen.",
        );
      }
      const blob = await res.blob();
      let filename =
        filenameFromDisposition(res.headers.get("content-disposition")) ||
        doc.name ||
        `dokumen-${doc.id}`;
      if (!/\.[a-z0-9]{2,5}$/i.test(filename)) {
        const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        const ext = EXT_BY_MIME[mime] ?? doc.file_ext;
        if (ext) filename = `${filename}.${ext}`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengunduh dokumen.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleVerify(doc: DocumentItem) {
    setVerifyingId(doc.id);
    setActionError(null);
    try {
      await api.put(`/documents/${doc.id}/verify`, {});
      await docs.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal memverifikasi dokumen.");
    } finally {
      setVerifyingId(null);
    }
  }

  const categoryLabel = (value: string) =>
    DOCUMENT_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dokumen"
        description="Repositori dokumen karyawan: personal, kepegawaian, dan perusahaan"
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            Unggah
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <Label htmlFor="dokumen-cari" className="mb-1.5">
            Cari
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              aria-hidden
            />
            <Input
              id="dokumen-cari"
              placeholder="Cari nama dokumen…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-44">
          <Label htmlFor="dokumen-kategori" className="mb-1.5">
            Kategori
          </Label>
          <Select
            id="dokumen-kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="semua">Semua</option>
            {DOCUMENT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="text-[13px] text-danger-text">
          {actionError}
        </p>
      )}

      {/* Daftar dokumen */}
      {docs.loading ? (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4" aria-label="Memuat dokumen">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} shape="text" className={i % 2 === 0 ? "w-3/4" : "w-1/2"} />
          ))}
        </div>
      ) : docs.error ? (
        <ErrorBlock message={docs.error} onRetry={() => void docs.reload()} />
      ) : items.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden />}
            title="Belum ada dokumen"
            description={
              debouncedQ || category !== "semua"
                ? "Tidak ada dokumen yang cocok dengan pencarian. Coba kata kunci atau filter lain."
                : "Dokumen yang diunggah akan tampil di sini."
            }
            actionLabel="Unggah"
            onAction={() => setUploadOpen(true)}
          />
        </div>
      ) : (
        <TableWrapper className="rounded-card border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama dokumen</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tipe file</TableHead>
                <TableHead>Kedaluwarsa</TableHead>
                <TableHead>Status verifikasi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((doc) => {
                const exp = expiryState(doc.expiry_date);
                const busy = downloadingId === doc.id || verifyingId === doc.id;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-56 font-medium">
                      <span className="block truncate" title={doc.name}>
                        {doc.name}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-text-secondary">
                      {doc.employee_name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{categoryLabel(doc.category)}</TableCell>
                    <TableCell>
                      {doc.file_ext ? (
                        <Badge variant="neutral">{doc.file_ext.toUpperCase()}</Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {doc.expiry_date ? (
                        <span className="flex flex-col items-start gap-1">
                          {formatDate(doc.expiry_date)}
                          <ExpiryBadge state={exp === "ok" ? null : exp} />
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <VerificationBadge verified={doc.verified} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void handleDownload(doc)}
                          disabled={busy}
                          title="Unduh"
                          aria-label={`Unduh ${doc.name}`}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Download className="h-4 w-4" aria-hidden />
                          )}
                        </Button>
                        {isHr && !doc.verified && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void handleVerify(doc)}
                            disabled={busy}
                            title="Verifikasi"
                            aria-label={`Verifikasi ${doc.name}`}
                            className="text-success-text hover:bg-success-soft"
                          >
                            {verifyingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <BadgeCheck className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(doc)}
                          disabled={busy}
                          title="Hapus"
                          aria-label={`Hapus ${doc.name}`}
                          className="text-danger-text hover:bg-danger-soft"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          void docs.reload();
        }}
      />

      <DeleteDialog
        doc={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          void docs.reload();
        }}
      />
    </div>
  );
}
