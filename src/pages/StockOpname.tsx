import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clipboard } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface OpnameItem { product_id: number; product_name: string; plu_code: string; base_unit: string; system_stock: number; }
interface Category { id: number; name: string; }

export default function StockOpname() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCat, setFilterCat] = useState<string>("");
  const [items, setItems] = useState<OpnameItem[]>([]);
  const [physical, setPhysical] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { invoke<Category[]>("list_categories").then(setCategories).catch(() => {}); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const catId = filterCat ? parseInt(filterCat) : undefined;
      const res = await invoke<OpnameItem[]>("get_stock_opname_data", { categoryId: catId });
      setItems(res); setPhysical({}); setNotes({});
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  }, [filterCat]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allFilled = items.every((item) => {
    const val = physical[item.product_id]; return val !== undefined && val !== "";
  });

  const handleSave = async () => {
    if (!allFilled) { setError("Semua produk harus diisi qty fisik"); return; }
    setSaving(true); setError("");
    try {
      const opnameItems = items.map((item) => ({
        product_id: item.product_id,
        actual_quantity: parseInt(physical[item.product_id]) || 0,
        notes: notes[item.product_id] || "",
      }));
      await invoke("save_stock_opname", { items: opnameItems });
      fetchData();
    } catch (err) { setError(String(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Clipboard} title="Stok Opname" subtitle="Cocokkan stok fisik dengan sistem">
        <select className="select select-bordered w-48" value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </PageHeader>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={Clipboard} title="Tidak ada produk"
            description="Tidak ada produk aktif untuk kategori ini. Tambah produk terlebih dahulu." />
        ) : (
          <table className="table table-zebra">
            <thead>
              <tr><th>Produk</th><th>PLU</th><th className="text-right">Stok Sistem</th><th className="text-right">Qty Fisik</th><th className="text-right">Selisih</th><th>Catatan</th></tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const qtyFisik = parseInt(physical[item.product_id]) || 0;
                const selisih = qtyFisik - item.system_stock;
                return (
                  <tr key={item.product_id}>
                    <td className="font-medium">{item.product_name}</td>
                    <td className="font-mono text-xs">{item.plu_code}</td>
                    <td className="text-right">{item.system_stock} {item.base_unit}</td>
                    <td className="text-right w-28">
                      <input type="number" className="input input-bordered input-sm w-full text-right" placeholder="0" min="0"
                        value={physical[item.product_id] ?? ""}
                        onChange={(e) => setPhysical((prev) => ({ ...prev, [item.product_id]: e.target.value }))} />
                    </td>
                    <td className={`text-right font-semibold ${selisih !== 0 ? "text-error" : ""}`}>
                      {physical[item.product_id] !== undefined && physical[item.product_id] !== ""
                        ? (selisih > 0 ? "+" : "") + selisih : "-"}
                    </td>
                    <td className="w-40">
                      <input type="text" className="input input-bordered input-sm w-full" placeholder="Catatan"
                        value={notes[item.product_id] ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [item.product_id]: e.target.value }))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={fetchData}>Reset</button>
          <button className="btn btn-primary" disabled={!allFilled || saving} onClick={handleSave}>
            {saving ? <span className="loading loading-spinner" /> : "Simpan Opname"}
          </button>
        </div>
      )}
    </div>
  );
}