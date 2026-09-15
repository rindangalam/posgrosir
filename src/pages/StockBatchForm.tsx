import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";

interface ProductBrief {
  id: number;
  plu_code: string;
  name: string;
  base_unit: string;
}

export default function StockBatchForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get("product_id");
  const isEdit = Boolean(id);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductBrief[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductBrief | null>(null);

  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [supplier, setSupplier] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load batch data for edit mode
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const batch = await invoke<{
          id: number; product_id: number; quantity: number; purchase_price: number;
          expiry_date: string | null; batch_code: string; supplier: string;
        }>("get_batch", { id: parseInt(id) });

        setQuantity(String(batch.quantity));
        setPurchasePrice(String(batch.purchase_price));
        setExpiryDate(batch.expiry_date || "");
        setBatchCode(batch.batch_code);
        setSupplier(batch.supplier);

        // Load product info
        const res = await invoke<{ product: ProductBrief & { is_active: boolean } }>("get_product", { id: batch.product_id });
        setSelectedProduct({
          id: res.product.id,
          plu_code: res.product.plu_code,
          name: res.product.name,
          base_unit: res.product.base_unit,
        });
      } catch {
        setError("Gagal memuat data batch");
      }
    })();
  }, [id]);

  // If product_id is in URL (create mode), fetch product
  useEffect(() => {
    if (!productIdParam || isEdit) return;
    (async () => {
      try {
        const res = await invoke<{ product: ProductBrief & { is_active: boolean } }>("get_product", { id: parseInt(productIdParam) });
        setSelectedProduct({
          id: res.product.id,
          plu_code: res.product.plu_code,
          name: res.product.name,
          base_unit: res.product.base_unit,
        });
      } catch {
        toast.error("Gagal memuat data produk");
      }
    })();
  }, [productIdParam, isEdit]);

  const searchProduct = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await invoke<{ product: ProductBrief }[]>("search_products", { query: q.trim() });
      setSearchResults(res.map((r) => r.product));
    } catch {
      setSearchResults([]);
      toast.error("Gagal mencari produk");
    }
  };

  const handleSave = async () => {
    setError("");
    if (!selectedProduct) { setError("Pilih produk terlebih dahulu"); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError("Quantity harus lebih dari 0"); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await invoke("update_batch", {
          id: parseInt(id!),
          quantity: qty,
          purchasePrice: parseInt(purchasePrice) || 0,
          expiryDate: expiryDate || null,
          batchCode: batchCode.trim(),
          supplier: supplier.trim(),
        });
      } else {
        await invoke("create_batch", {
          productId: selectedProduct.id,
          input: {
            quantity: qty,
            purchase_price: parseInt(purchasePrice) || 0,
            expiry_date: expiryDate || null,
            batch_code: batchCode.trim(),
            supplier: supplier.trim(),
          },
        });
      }
      navigate("/stocks");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/stocks")}>← Kembali</button>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Batch Stok" : "Tambah Batch Stok"}</h1>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      {/* Product selection */}
      <div className="bg-base-200 rounded-box p-4 space-y-2">
        <label className="label"><span className="label-text">Produk</span></label>
        {selectedProduct ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{selectedProduct.name}</span>
              <span className="text-xs text-base-content/60 ml-2">({selectedProduct.plu_code})</span>
            </div>
            {!isEdit && (
              <button className="btn btn-ghost btn-xs" onClick={() => { setSelectedProduct(null); setSearchResults([]); }}>
                Ganti
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => searchProduct(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="border border-base-300 rounded-box max-h-40 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 hover:bg-base-300 text-sm"
                    onClick={() => { setSelectedProduct(p); setSearchQuery(""); setSearchResults([]); }}
                  >
                    {p.name} <span className="text-xs text-base-content/60">({p.plu_code})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          {/* Form fields */}
          <div className="bg-base-200 rounded-box p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label"><span className="label-text">Quantity ({selectedProduct.base_unit}) *</span></label>
                <input type="number" className="input input-bordered w-full" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)} min="1" />
              </div>
              <div>
                <label className="label"><span className="label-text">Harga Beli / {selectedProduct.base_unit}</span></label>
                <input type="number" className="input input-bordered w-full" value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)} min="0" />
              </div>
            </div>

            <div>
              <label className="label"><span className="label-text">Expiry Date</span></label>
              <input type="date" className="input input-bordered w-full" value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]} />
            </div>

            <div>
              <label className="label"><span className="label-text">Batch Code</span></label>
              <input type="text" className="input input-bordered w-full" value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)} placeholder="Dari supplier" />
            </div>

            <div>
              <label className="label"><span className="label-text">Supplier</span></label>
              <input type="text" className="input input-bordered w-full" value={supplier}
                onChange={(e) => setSupplier(e.target.value)} placeholder="Nama supplier" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button className="btn btn-ghost" onClick={() => navigate("/stocks")}>Batal</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? <span className="loading loading-spinner" /> : isEdit ? "Simpan Perubahan" : "Simpan Batch"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
