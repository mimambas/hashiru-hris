"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { DocumentItem } from "./types";

function DeleteDialog({
  doc,
  onClose,
  onDeleted,
}: {
  doc: DocumentItem | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (doc) setError(null);
  }, [doc]);

  async function handleDelete() {
    if (!doc) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/documents/${doc.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus dokumen. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={doc !== null}
      onClose={() => (deleting ? undefined : onClose())}
      title="Hapus dokumen"
      description="Tindakan ini tidak dapat dibatalkan."
    >
      <p className="text-sm text-text-secondary">
        Hapus dokumen <span className="font-medium text-text">“{doc?.name}”</span> dari repositori?
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger-text">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={deleting}>
          Batal
        </Button>
        <Button variant="destructive" onClick={() => void handleDelete()} loading={deleting}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Hapus
        </Button>
      </div>
    </Dialog>
  );
}

export { DeleteDialog };
