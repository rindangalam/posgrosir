import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clipboard, Warning, CheckCircle } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";

interface LowStockProduct {
  id: number; plu_code: string; name: string; total_stock: number;
  stock_threshold: number; base_unit: string;
}

export default function StockReport() {
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<LowStockProduct[]>("get_low_stock_products")
      .then(setLowStock)
      .catch(() => setLowStock([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader icon={Clipboard} title="Laporan Stok" subtitle="Stok menipis dan riwayat batch" />

      <div className="bg-base-200 rounded-box p-4">
        <h2 className="font-heading font-bold mb-3 flex items-center gap-2">
          <Warning size={20} className="text-warning" weight="fill" />
          Stok Menipis
          {!loading && (
            <span className="badge badge-warning badge-sm">{lowStock.length} produk</span>
          )}
        </h2>

        {loading ? (
          <div className="p-4 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : lowStock.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-base-content/40">
            <CheckCircle size={40} weight="thin" />
            <p className="text-sm">Semua stok aman</p>
          </div>
        ) : (
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Produk</th><th>PLU</th><th className="text-right">Stok</th>
                <th className="text-right">Threshold</th><th className="text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="font-mono text-xs">{p.plu_code}</td>
                  <td className="text-right text-error font-semibold">{p.total_stock} {p.base_unit}</td>
                  <td className="text-right">{p.stock_threshold}</td>
                  <td className="text-right text-error">{p.total_stock - p.stock_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-base-200 rounded-box p-4">
        <h2 className="font-heading font-bold mb-3">Riwayat Stok Opname</h2>
        <p className="text-sm text-base-content/60">Riwayat opname tersedia setelah stok opname dilakukan.</p>
      </div>
    </div>
  );
}
