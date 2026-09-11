import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { Package, Plus, UploadSimple, FileArrowDown, X, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { formatRupiah } from "@/lib/currency";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface ProductWithStock {
  product: {
    id: number; plu_code: string; barcode: string | null; name: string;
    description: string; category_id: number | null; base_unit: string;
    purchase_price: number; selling_price: number; stock_threshold: number;
    is_active: boolean; created_at: string; updated_at: string;
  };
  total_stock: number;
}

interface Category { id: number; name: string; }

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  products: string[];
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const catId = filterCat ? parseInt(filterCat) : undefined;
      const res = await invoke<ProductWithStock[]>("list_products", {
        search: search || undefined, categoryId: catId, page, limit,
      });
      setProducts(res);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [search, filterCat, page]);

  const fetchCategories = useCallback(async () => {
    try { setCategories(await invoke<Category[]>("list_categories")); } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (productId: number, productName: string) => {
    if (!window.confirm(`Hapus produk "${productName}"?`)) return;
    try {
      await invoke("delete_product", { id: productId });
      toast.success("Produk dihapus");
      fetchProducts();
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const bytes = await invoke<number[]>("download_product_template");
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-produk.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal download template: " + String(err));
    }
  };

  const handleImportClick = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImport(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const buffer = await importFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const result = await invoke<ImportResult>("import_products_xlsx", { base64Content: base64 });
      setImportResult(result);
      if (result.imported > 0) fetchProducts();
    } catch (err) {
      setImportResult({ imported: 0, skipped: 0, errors: [String(err)], products: [] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Package} title="Daftar Produk" subtitle={`${products.length} produk terdaftar`}>
        <button className="btn btn-ghost btn-sm" onClick={handleDownloadTemplate}>
          <FileArrowDown size={18} /> Template
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleImportClick}>
          <UploadSimple size={18} /> Import Excel
        </button>
        <button className="btn btn-primary" onClick={() => navigate("/products/form")}>
          <Plus size={18} weight="bold" /> Tambah Produk
        </button>
      </PageHeader>

      <div className="flex gap-2">
        <input type="text" className="input input-bordered flex-1" placeholder="Cari nama / barcode / PLU..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="select select-bordered w-48" value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="Belum ada produk"
            description="Klik 'Tambah Produk' untuk membuat produk pertama."
            action={{ label: "Tambah Produk", onClick: () => navigate("/products/form") }} />
        ) : (
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>PLU</th><th>Barcode</th><th>Nama</th><th>Kategori</th>
                <th>Harga Beli</th><th>Harga Jual</th><th>Stok</th><th>Threshold</th>
                <th className="w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product.id}>
                  <td className="font-mono text-xs">{p.product.plu_code}</td>
                  <td className="font-mono text-xs">{p.product.barcode || "-"}</td>
                  <td className="font-medium">{p.product.name}</td>
                  <td className="text-xs">{categories.find((c) => c.id === p.product.category_id)?.name || "-"}</td>
                  <td>{formatRupiah(p.product.purchase_price)}</td>
                  <td className="font-semibold">{formatRupiah(p.product.selling_price)}</td>
                  <td><span className={p.total_stock <= p.product.stock_threshold ? "text-error font-semibold" : ""}>{p.total_stock} {p.product.base_unit}</span></td>
                  <td className="text-xs">{p.product.stock_threshold}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-xs btn-ghost" onClick={() => navigate(`/products/form/${p.product.id}`)}>Edit</button>
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDelete(p.product.id, p.product.name)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {products.length > 0 && (
        <div className="flex justify-center gap-2">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
          <span className="btn btn-sm btn-disabled">Halaman {page}</span>
          <button className="btn btn-sm" disabled={products.length < limit} onClick={() => setPage((p) => p + 1)}>Selanjutnya</button>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!importing) setShowImport(false); }}>
          <div className="bg-base-100 rounded-box p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Import Produk dari Excel</h3>
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => { if (!importing) setShowImport(false); }} disabled={importing}>
                <X size={18} />
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-box bg-success/10">
                  <CheckCircle size={24} className="text-success" weight="fill" />
                  <div>
                    <p className="font-semibold">{importResult.imported} produk berhasil diimport</p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-warning">{importResult.skipped} produk dilewati</p>
                    )}
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-sm flex items-center gap-1">
                      <WarningCircle size={16} className="text-warning" /> Detail Error:
                    </p>
                    <div className="max-h-40 overflow-y-auto text-xs text-error space-y-1 bg-base-200 p-3 rounded-box">
                      {importResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.products.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Produk diimport:</p>
                    <div className="max-h-32 overflow-y-auto text-xs text-base-content/60 bg-base-200 p-3 rounded-box">
                      {importResult.products.map((name, i) => (
                        <p key={i}>{i + 1}. {name}</p>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn btn-primary w-full" onClick={() => setShowImport(false)}>Selesai</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-base-content/60">
                  Pilih file Excel (.xlsx) dengan format yang sesuai. <br />
                  <button className="link link-primary" onClick={handleDownloadTemplate}>Download template</button> jika belum punya.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="file-input file-input-bordered w-full"
                  onChange={handleFileSelect}
                />

                {importFile && (
                  <div className="flex items-center gap-2 p-3 bg-base-200 rounded-box">
                    <FileArrowDown size={18} className="text-primary" />
                    <span className="text-sm font-medium">{importFile.name}</span>
                    <span className="text-xs text-base-content/60">({(importFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button className="btn btn-ghost" onClick={() => setShowImport(false)} disabled={importing}>Batal</button>
                  <button className="btn btn-primary" disabled={!importFile || importing} onClick={handleImportSubmit}>
                    {importing ? <span className="loading loading-spinner" /> : "Import"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}