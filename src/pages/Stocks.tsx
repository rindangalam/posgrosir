import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { Archive, Plus, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { formatRupiah } from "@/lib/currency";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface StockBatch {
  id: number; product_id: number; quantity: number; purchase_price: number;
  expiry_date: string | null; received_date: string; batch_code: string;
  supplier: string; is_deleted: boolean; created_at: string; updated_at: string;
}

interface ProductBrief { id: number; plu_code: string; name: string; base_unit: string; }
interface ProductDetail { id: number; plu_code: string; name: string; selling_price: number; base_unit: string; }

export default function Stocks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductBrief[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [totalStock, setTotalStock] = useState(0);
  const [loading, setLoading] = useState(false);

  const searchProduct = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await invoke<{ product: ProductBrief }[]>("search_products", { query: q.trim() });
      setSearchResults(res.map((r) => r.product));
    } catch { setSearchResults([]); }
  }, []);

  const fetchBatches = useCallback(async (productId: number) => {
    setLoading(true);
    try {
      const res = await invoke<StockBatch[]>("list_batches", { productId });
      setBatches(res);
      setTotalStock(res.reduce((sum, b) => sum + b.quantity, 0));
    } catch { setBatches([]); setTotalStock(0); }
    finally { setLoading(false); }
  }, []);

  const selectProduct = async (p: ProductBrief) => {
    try {
      const detail = await invoke<{ product: ProductDetail }>("get_product", { id: p.id });
      setSelectedProduct({
        id: detail.product.id, plu_code: detail.product.plu_code,
        name: detail.product.name, selling_price: detail.product.selling_price,
        base_unit: detail.product.base_unit,
      });
      setSearchResults([]); setSearchQuery("");
      fetchBatches(p.id);
    } catch { /* ignore */ }
  };

  const handleDelete = async (batchId: number) => {
    try {
      await invoke("delete_batch", { id: batchId });
      if (selectedProduct) fetchBatches(selectedProduct.id);
    } catch { /* ignore */ }
  };

  const [editBatch, setEditBatch] = useState<StockBatch | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editCode, setEditCode] = useState("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editExpiry, setEditExpiry] = useState("");

  const openEdit = (b: StockBatch) => {
    setEditBatch(b);
    setEditQty(b.quantity);
    setEditPrice(b.purchase_price);
    setEditCode(b.batch_code);
    setEditSupplier(b.supplier);
    setEditExpiry(b.expiry_date || "");
  };

  const handleEditSave = async () => {
    if (!editBatch || !selectedProduct) return;
    try {
      await invoke("update_batch", {
        id: editBatch.id,
        quantity: editQty,
        purchasePrice: editPrice,
        batchCode: editCode.trim(),
        supplier: editSupplier.trim(),
        expiryDate: editExpiry || null,
      });
      toast.success("Batch diupdate");
      setEditBatch(null);
      fetchBatches(selectedProduct.id);
    } catch (err) { toast.error(String(err)); }
  };

  const expired = (date: string | null) => date ? new Date(date) < new Date() : false;

  return (
    <div className="space-y-4">
      <PageHeader icon={Archive} title="Manajemen Stok" subtitle="Kelola batch stok per produk">
        {selectedProduct && (
          <button className="btn btn-primary" onClick={() => navigate(`/stocks/batch?product_id=${selectedProduct.id}`)}>
            <Plus size={18} weight="bold" /> Tambah Batch
          </button>
        )}
      </PageHeader>

      <div className="bg-base-200 rounded-box p-4 space-y-2">
        <label className="label"><span className="label-text">Cari Produk</span></label>
        {selectedProduct ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-lg">{selectedProduct.name}</span>
              <span className="text-sm text-base-content/60 ml-2">
                ({selectedProduct.plu_code}) — Stok: {totalStock} {selectedProduct.base_unit}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)}>Ganti</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input type="text" className="input input-bordered w-full pl-10" placeholder="Cari produk..."
                value={searchQuery} onChange={(e) => searchProduct(e.target.value)} />
            </div>
            {searchResults.length > 0 && (
              <div className="border border-base-300 rounded-box max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-base-300 text-sm"
                    onClick={() => selectProduct(p)}>
                    {p.name} <span className="text-xs text-base-content/60">({p.plu_code})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="bg-base-200 rounded-box overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
          ) : batches.length === 0 ? (
            <EmptyState icon={Archive} title="Belum ada batch stok"
              description="Klik 'Tambah Batch' untuk menambah stok baru."
              action={{ label: "Tambah Batch", onClick: () => navigate(`/stocks/batch?product_id=${selectedProduct.id}`) }} />
          ) : (
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Batch Code</th><th>Quantity ({selectedProduct.base_unit})</th>
                  <th>Harga Beli</th><th>Supplier</th><th>Received</th><th>Expiry</th>
                  <th className="w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs">{b.batch_code || "-"}</td>
                    <td className={b.quantity === 0 ? "text-base-content/40" : "font-semibold"}>{b.quantity}</td>
                    <td>{formatRupiah(b.purchase_price)}</td>
                    <td className="text-xs">{b.supplier || "-"}</td>
                    <td className="text-xs">{b.received_date}</td>
                    <td className="text-xs">
                      {b.expiry_date ? (
                        <span className={expired(b.expiry_date) ? "text-error" : ""}>
                          {b.expiry_date}{expired(b.expiry_date) && " (expired)"}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-xs btn-ghost" onClick={() => openEdit(b)}><PencilSimple size={14} /></button>
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDelete(b.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selectedProduct && (
        <div className="p-8 text-center text-base-content/40">
          Cari produk untuk melihat daftar batch stok
        </div>
      )}

      {editBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditBatch(null)}>
          <div className="bg-base-100 rounded-box p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Edit Batch</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label"><span className="label-text">Quantity ({selectedProduct?.base_unit})</span></label>
                <input type="number" className="input input-bordered" value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))} min={0} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Harga Beli</span></label>
                <input type="number" className="input input-bordered" value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))} min={0} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Batch Code</span></label>
                <input type="text" className="input input-bordered" value={editCode}
                  onChange={(e) => setEditCode(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Supplier</span></label>
                <input type="text" className="input input-bordered" value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Expiry Date</span></label>
                <input type="date" className="input input-bordered" value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button className="btn btn-ghost" onClick={() => setEditBatch(null)}>Batal</button>
                <button className="btn btn-primary" onClick={handleEditSave}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}