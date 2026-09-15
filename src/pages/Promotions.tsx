import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { Tag, Plus, Trash } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface Promotion {
  id: number; name: string; promo_type: string; value: number;
  scope: string; scope_id: number | null; start_date: string;
  end_date: string; is_active: boolean; created_at: string;
}

interface FormData {
  name: string; promo_type: string; value: string; scope: string;
  scope_id: string; start_date: string; end_date: string;
}

interface CategoryOption { id: number; name: string; }
interface ProductOption { id: number; name: string; plu_code: string; }

const emptyForm: FormData = {
  name: "", promo_type: "percentage", value: "", scope: "all",
  scope_id: "", start_date: "", end_date: "",
};

const scopeLabels: Record<string, string> = { all: "Semua Produk", category: "Per Kategori", product: "Per Produk" };

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try { setPromotions(await invoke<Promotion[]>("list_promotions")); }
    catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const fetchScopeOptions = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        invoke<{ id: number; name: string }[]>("list_categories"),
        invoke<{ product: { id: number; name: string; plu_code: string } }[]>("list_products", { search: "", page: 1, limit: 500 }),
      ]);
      setCategories(cats);
      setProducts(prods.map((p) => ({ id: p.product.id, name: p.product.name, plu_code: p.product.plu_code })));
    } catch { toast.error("Gagal memuat data"); }
  }, []);

  useEffect(() => { if (showForm) fetchScopeOptions(); }, [showForm, fetchScopeOptions]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setError(""); };

  const openEdit = (p: Promotion) => {
    setForm({
      name: p.name, promo_type: p.promo_type, value: String(p.value),
      scope: p.scope, scope_id: p.scope_id ? String(p.scope_id) : "",
      start_date: p.start_date, end_date: p.end_date,
    });
    setEditingId(p.id); setShowForm(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim() || !form.value || !form.start_date || !form.end_date) {
      setError("Semua field harus diisi"); return;
    }
    const input = {
      name: form.name.trim(), promo_type: form.promo_type, value: parseFloat(form.value),
      scope: form.scope, scope_id: form.scope_id ? parseInt(form.scope_id) : null,
      start_date: form.start_date, end_date: form.end_date,
    };
    setSaving(true);
    try {
      if (editingId) await invoke("update_promotion", { id: editingId, input });
      else await invoke("create_promotion", { input });
      resetForm(); setShowForm(false); fetchPromotions();
    } catch (err) { setError(String(err)); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: number) => {
    try { await invoke("toggle_promotion", { id }); fetchPromotions(); }
    catch (err) { setError(String(err)); }
  };

  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus promo ini?")) return;
    setDeleting(id);
    try { await invoke("delete_promotion", { id }); fetchPromotions(); }
    catch (err) { setError(String(err)); }
    finally { setDeleting(null); }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <PageHeader icon={Tag} title="Promo" subtitle={`${promotions.length} promo aktif`}>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} weight="bold" /> Tambah Promo
        </button>
      </PageHeader>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : promotions.length === 0 ? (
          <EmptyState icon={Tag} title="Belum ada promo"
            description="Klik 'Tambah Promo' untuk membuat promosi baru."
            action={{ label: "Tambah Promo", onClick: () => { resetForm(); setShowForm(true); } }} />
        ) : (
          <table className="table table-zebra">
            <thead>
              <tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Scope</th><th>Periode</th><th>Status</th><th className="w-24">Aksi</th></tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.promo_type === "percentage" ? "%" : "Rp"}</td>
                  <td>{p.promo_type === "percentage" ? `${p.value}%` : `Rp${p.value.toLocaleString("id-ID")}`}</td>
                  <td>{scopeLabels[p.scope] || p.scope}</td>
                  <td className="text-xs">{p.start_date} s/d {p.end_date}</td>
                  <td>
                    <button className={`badge ${p.is_active ? "badge-success" : "badge-ghost"} cursor-pointer`}
                      onClick={() => handleToggle(p.id)}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-xs btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDelete(p.id)} disabled={deleting === p.id}>
                        {deleting === p.id ? <span className="loading loading-spinner loading-xs" /> : <Trash size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-box p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editingId ? "Edit Promo" : "Tambah Promo"}</h3>
            <div className="space-y-3">
              <div>
                <label className="label"><span className="label-text">Nama Promo</span></label>
                <input type="text" className="input input-bordered w-full" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label"><span className="label-text">Tipe</span></label>
                  <select className="select select-bordered w-full" value={form.promo_type}
                    onChange={(e) => setForm({ ...form, promo_type: e.target.value })}>
                    <option value="percentage">Persen (%)</option>
                    <option value="nominal">Nominal (Rp)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="label"><span className="label-text">Nilai</span></label>
                  <input type="number" className="input input-bordered w-full" value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    min="0" max={form.promo_type === "percentage" ? "100" : undefined} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label"><span className="label-text">Scope</span></label>
                  <select className="select select-bordered w-full" value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value, scope_id: "" })}>
                    <option value="all">Semua Produk</option>
                    <option value="category">Per Kategori</option>
                    <option value="product">Per Produk</option>
                  </select>
                </div>
                {form.scope === "category" && (
                  <div className="flex-1">
                    <label className="label"><span className="label-text">Kategori</span></label>
                    <select className="select select-bordered w-full" value={form.scope_id}
                      onChange={(e) => setForm({ ...form, scope_id: e.target.value })}>
                      <option value="">Pilih kategori...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {form.scope === "product" && (
                  <div className="flex-1">
                    <label className="label"><span className="label-text">Produk</span></label>
                    <select className="select select-bordered w-full" value={form.scope_id}
                      onChange={(e) => setForm({ ...form, scope_id: e.target.value })}>
                      <option value="">Pilih produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.plu_code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label"><span className="label-text">Mulai</span></label>
                  <input type="date" className="input input-bordered w-full" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} min={editingId ? undefined : today} />
                </div>
                <div className="flex-1">
                  <label className="label"><span className="label-text">Selesai</span></label>
                  <input type="date" className="input input-bordered w-full" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} min={form.start_date || today} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>Batal</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? <span className="loading loading-spinner" /> : editingId ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}