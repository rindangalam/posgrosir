import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

interface ProductData {
  id?: number;
  plu_code: string;
  barcode: string;
  name: string;
  description: string;
  category_id: number | null;
  base_unit: string;
  purchase_price: number;
  selling_price: number;
  stock_threshold: number;
}

interface UnitConv {
  from_unit: string;
  to_unit: string;
  factor: number;
  is_default: boolean;
}

interface Category {
  id: number;
  name: string;
}

const emptyProduct: ProductData = {
  plu_code: "",
  barcode: "",
  name: "",
  description: "",
  category_id: null,
  base_unit: "pcs",
  purchase_price: 0,
  selling_price: 0,
  stock_threshold: 0,
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<ProductData>(emptyProduct);
  const [conversions, setConversions] = useState<UnitConv[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await invoke<Category[]>("list_categories");
      setCategories(res);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await invoke<{
          product: ProductData & { is_active: boolean; created_at: string; updated_at: string };
          total_stock: number;
        }>("get_product", { id: parseInt(id!) });

        setForm({
          id: res.product.id,
          plu_code: res.product.plu_code,
          barcode: res.product.barcode || "",
          name: res.product.name,
          description: res.product.description,
          category_id: res.product.category_id,
          base_unit: res.product.base_unit,
          purchase_price: res.product.purchase_price,
          selling_price: res.product.selling_price,
          stock_threshold: res.product.stock_threshold,
        });

        const convs = await invoke<UnitConv[]>("get_unit_conversions", { productId: res.product.id });
        setConversions(convs);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, id]);

  const handleSave = async () => {
    setError("");
    if (!form.plu_code.trim()) { setError("PLU code harus diisi"); return; }
    if (!form.name.trim()) { setError("Nama produk harus diisi"); return; }
    if (form.selling_price <= 0) { setError("Harga jual harus lebih dari 0"); return; }

    setSaving(true);
    try {
      let productId: number;
      if (isEdit) {
        await invoke("update_product", {
          id: parseInt(id!),
          pluCode: form.plu_code.trim(),
          barcode: form.barcode.trim() || null,
          name: form.name.trim(),
          description: form.description.trim(),
          categoryId: form.category_id,
          baseUnit: form.base_unit.trim(),
          purchasePrice: form.purchase_price,
          sellingPrice: form.selling_price,
          stockThreshold: form.stock_threshold,
        });
        productId = parseInt(id!);
      } else {
        const created = await invoke<ProductData>("create_product", {
          input: {
            plu_code: form.plu_code.trim(),
            barcode: form.barcode.trim() || null,
            name: form.name.trim(),
            description: form.description.trim(),
            category_id: form.category_id,
            base_unit: form.base_unit.trim(),
            purchase_price: form.purchase_price,
            selling_price: form.selling_price,
            stock_threshold: form.stock_threshold,
          },
        });
        productId = created.id!;
      }

      await invoke("set_unit_conversions", {
        productId,
        conversions: conversions.map((c) => ({
          fromUnit: c.from_unit.trim(),
          toUnit: c.to_unit.trim(),
          factor: c.factor,
          isDefault: c.is_default,
        })),
      });

      navigate("/products");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof ProductData>(key: K, value: ProductData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addConversion = () => {
    setConversions((prev) => [
      ...prev,
      { from_unit: form.base_unit, to_unit: "", factor: 1, is_default: false },
    ]);
  };

  const updateConv = (idx: number, field: keyof UnitConv, value: string | number | boolean) => {
    setConversions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value as never };
      return next;
    });
  };

  const removeConv = (idx: number) => {
    setConversions((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/products")}>
          ← Kembali
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Produk" : "Tambah Produk"}</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-base-200 rounded-box p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label"><span className="label-text">PLU Code *</span></label>
            <input type="text" className="input input-bordered w-full" value={form.plu_code}
              onChange={(e) => updateField("plu_code", e.target.value)} />
          </div>
          <div>
            <label className="label"><span className="label-text">Barcode</span></label>
            <input type="text" className="input input-bordered w-full" value={form.barcode}
              onChange={(e) => updateField("barcode", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label"><span className="label-text">Nama Produk *</span></label>
          <input type="text" className="input input-bordered w-full" value={form.name}
            onChange={(e) => updateField("name", e.target.value)} />
        </div>

        <div>
          <label className="label"><span className="label-text">Deskripsi</span></label>
          <textarea className="textarea textarea-bordered w-full" rows={2} value={form.description}
            onChange={(e) => updateField("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label"><span className="label-text">Kategori</span></label>
            <select className="select select-bordered w-full" value={form.category_id ?? ""}
              onChange={(e) => updateField("category_id", e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">Tidak Ada</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label"><span className="label-text">Satuan Dasar</span></label>
            <select className="select select-bordered w-full" value={form.base_unit}
              onChange={(e) => updateField("base_unit", e.target.value)}>
              <option value="pcs">Pcs</option>
              <option value="gram">Gram</option>
              <option value="ml">Ml</option>
              <option value="dus">Dus</option>
              <option value="pack">Pack</option>
              <option value="kg">Kg</option>
              <option value="liter">Liter</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label"><span className="label-text">Harga Beli (Rp)</span></label>
            <input type="number" className="input input-bordered w-full" value={form.purchase_price}
              onChange={(e) => updateField("purchase_price", parseInt(e.target.value) || 0)} min="0" />
          </div>
          <div>
            <label className="label"><span className="label-text">Harga Jual (Rp) *</span></label>
            <input type="number" className="input input-bordered w-full" value={form.selling_price}
              onChange={(e) => updateField("selling_price", parseInt(e.target.value) || 0)} min="0" />
          </div>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Stok Threshold (peringatan stok menipis)</span>
          </label>
          <input type="number" className="input input-bordered w-full" value={form.stock_threshold}
            onChange={(e) => updateField("stock_threshold", parseInt(e.target.value) || 0)} min="0" />
        </div>
      </div>

      {/* Unit Conversions */}
      <div className="bg-base-200 rounded-box p-6 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">Konversi Satuan</h2>
          <button className="btn btn-sm btn-outline" onClick={addConversion}>
            Tambah Konversi
          </button>
        </div>

        {conversions.length === 0 ? (
          <p className="text-sm text-base-content/60">
            Belum ada konversi. Gunakan satuan dasar "{form.base_unit}" untuk transaksi.
          </p>
        ) : (
          <div className="space-y-2">
            {conversions.map((conv, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm font-mono w-16">{conv.from_unit}</span>
                <span className="text-xs">→</span>
                <input type="text" className="input input-bordered input-sm w-20" placeholder="Ke"
                  value={conv.to_unit} onChange={(e) => updateConv(idx, "to_unit", e.target.value)} />
                <span className="text-xs">×</span>
                <input type="number" className="input input-bordered input-sm w-24" placeholder="Faktor"
                  value={conv.factor} onChange={(e) => updateConv(idx, "factor", parseFloat(e.target.value) || 1)}
                  min="0.001" step="any" />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={conv.is_default}
                    onChange={(e) => updateConv(idx, "is_default", e.target.checked)} />
                  Default
                </label>
                <button className="btn btn-ghost btn-xs text-error" onClick={() => removeConv(idx)}>
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button className="btn btn-ghost" onClick={() => navigate("/products")}>Batal</button>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? <span className="loading loading-spinner" /> : isEdit ? "Simpan" : "Tambah Produk"}
        </button>
      </div>
    </div>
  );
}
