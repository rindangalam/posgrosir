import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { SquaresFour, Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface Category {
  id: number; name: string; description: string;
  parent_id: number | null; created_at: string; updated_at: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await invoke<Category[]>("list_categories");
      setCategories(res);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditId(null); setFormName(""); setFormDesc(""); setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id); setFormName(cat.name); setFormDesc(cat.description); setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nama kategori harus diisi"); return; }
    try {
      if (editId) {
        await invoke("update_category", { id: editId, name: formName.trim(), description: formDesc.trim() });
        toast.success("Kategori diupdate");
      } else {
        await invoke("create_category", { name: formName.trim(), description: formDesc.trim() || null, parentId: null as number | null });
        toast.success("Kategori dibuat");
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(String(err)); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus kategori "${name}"? Produk dengan kategori ini akan kehilangan kategorinya.`)) return;
    try {
      await invoke("delete_category", { id });
      toast.success("Kategori dihapus");
      fetchData();
    } catch (err) { toast.error(String(err)); }
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={SquaresFour} title="Kategori" subtitle="Kelola kategori produk">
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18} weight="bold" /> Tambah</button>
      </PageHeader>

      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : categories.length === 0 ? (
          <EmptyState icon={SquaresFour} title="Belum ada kategori"
            description="Buat kategori pertama untuk mengelompokkan produk."
            action={{ label: "Buat Kategori", onClick: openCreate }} />
        ) : (
          <table className="table table-zebra">
            <thead>
              <tr><th>Nama</th><th>Deskripsi</th><th>Dibuat</th><th className="w-24">Aksi</th></tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="font-medium">{cat.name}</td>
                  <td className="text-sm text-base-content/60">{cat.description || "-"}</td>
                  <td className="text-xs">{cat.created_at}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-xs btn-ghost" onClick={() => openEdit(cat)}><PencilSimple size={14} /></button>
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDelete(cat.id, cat.name)}><Trash size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-base-100 rounded-box p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{editId ? "Edit Kategori" : "Kategori Baru"}</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label"><span className="label-text">Nama</span></label>
                <input type="text" className="input input-bordered" value={formName}
                  onChange={(e) => setFormName(e.target.value)} autoFocus />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Deskripsi (opsional)</span></label>
                <input type="text" className="input input-bordered" value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
