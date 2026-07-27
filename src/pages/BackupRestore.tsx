import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CloudArrowUp,
  CloudArrowDown,
  Trash,
  Upload,
  File,
  Clock,
} from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface BackupInfo {
  filename: string;
  display_name: string;
  size_bytes: number;
  created_at: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupRestore() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke<BackupInfo[]>("list_backups");
      setBackups(res);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const result = await invoke<BackupInfo>("create_backup", {
        label: label.trim() || null,
      });
      setSuccess(`Backup berhasil: ${result.display_name}`);
      setLabel("");
      fetchBackups();
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(`Yakin restore backup "${filename}"? Semua data saat ini akan diganti.`)) return;
    setRestoring(filename);
    setError("");
    setSuccess("");
    try {
      await invoke("restore_backup", { filename });
      setSuccess(`Backup "${filename}" berhasil direstore. Aplikasi akan menggunakan data backup.`);
      fetchBackups();
    } catch (err) {
      setError(String(err));
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Hapus backup "${filename}"?`)) return;
    setDeleting(filename);
    setError("");
    setSuccess("");
    try {
      await invoke("delete_backup", { filename });
      setSuccess(`Backup "${filename}" berhasil dihapus.`);
      fetchBackups();
    } catch (err) {
      setError(String(err));
    } finally {
      setDeleting(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    try {
      const buffer = await file.arrayBuffer();
      const content = Array.from(new Uint8Array(buffer));
      const result = await invoke<BackupInfo>("import_backup_file", { content });
      setSuccess(`File berhasil diimport dan direstore: ${result.display_name}`);
      fetchBackups();
    } catch (err) {
      setError(String(err));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={CloudArrowUp}
        title="Backup & Restore"
        subtitle="Cadangkan dan pulihkan database"
      />

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setError("")}>x</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setSuccess("")}>x</button>
        </div>
      )}

      {/* Create Backup */}
      <div className="bg-base-200 rounded-box p-4 space-y-3">
        <h2 className="font-heading font-bold">Buat Backup Baru</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label py-1"><span className="label-text">Label (opsional)</span></label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Misal: sebelum-opname"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={creating} onClick={handleCreate}>
            {creating ? (
              <span className="loading loading-spinner" />
            ) : (
              <>
                <CloudArrowDown size={18} weight="bold" /> Backup Sekarang
              </>
            )}
          </button>
        </div>
      </div>

      {/* Import from file */}
      <div className="bg-base-200 rounded-box p-4 space-y-3">
        <h2 className="font-heading font-bold">Import dari File</h2>
        <p className="text-sm text-base-content/60">Pilih file database .db hasil backup untuk direstore.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db"
          className="file-input file-input-bordered w-full max-w-xs"
          onChange={handleImport}
        />
      </div>

      {/* Backup List */}
      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : backups.length === 0 ? (
          <EmptyState
            icon={CloudArrowUp}
            title="Belum ada backup"
            description="Buat backup pertama untuk melindungi data toko Anda."
            action={{ label: "Buat Backup", onClick: handleCreate }}
          />
        ) : (
          <div className="divide-y divide-base-300">
            {backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between px-4 py-3 hover:bg-base-300/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <File size={20} className="text-primary" weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.display_name}</p>
                    <p className="text-xs text-base-content/60 flex items-center gap-1">
                      <Clock size={12} /> {b.created_at} &middot; {formatSize(b.size_bytes)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleRestore(b.filename)}
                    disabled={restoring === b.filename}
                  >
                    {restoring === b.filename ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <>
                        <Upload size={16} /> Restore
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost text-error"
                    onClick={() => handleDelete(b.filename)}
                    disabled={deleting === b.filename}
                  >
                    {deleting === b.filename ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Trash size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}