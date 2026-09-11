import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clipboard, Warning, CheckCircle } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";

interface LowStockProduct {
  id: number; plu_code: string; name: string; total_stock: number;
  stock_threshold: number; base_unit: string;
}

interface OpnameRecord {
  id: number; product_id: number; product_name: string; plu_code: string;
  system_quantity: number; actual_quantity: number; difference: number;
  notes: string; created_at: string;
}

export default function StockReport() {
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [opnameHistory, setOpnameHistory] = useState<OpnameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      invoke<LowStockProduct[]>("get_low_stock_products").catch(() => []),
      invoke<OpnameRecord[]>("list_stock_opname", { limit: 50 }).catch(() => []),
    ]).then(([low, opname]) => {
      setLowStock(low);
      setOpnameHistory(opname);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader icon={Clipboard} title="Laporan Stok" subtitle="Stok menipis dan riwayat opname" />

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
        <h2 className="font-heading font-bold mb-3 flex items-center gap-2">
          <Clipboard size={20} className="text-primary" weight="fill" />
          Riwayat Stok Opname
          {!loading && opnameHistory.length > 0 && (
            <span className="badge badge-primary badge-sm">{opnameHistory.length}</span>
          )}
        </h2>

        {loading ? (
          <div className="p-4 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : opnameHistory.length === 0 ? (
          <p className="text-sm text-base-content/60 py-4">Belum ada riwayat stok opname.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Tanggal</th><th>Produk</th><th>PLU</th>
                  <th className="text-right">Stok Sistem</th>
                  <th className="text-right">Qty Fisik</th>
                  <th className="text-right">Selisih</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {opnameHistory.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">{r.created_at}</td>
                    <td>{r.product_name}</td>
                    <td className="font-mono text-xs">{r.plu_code}</td>
                    <td className="text-right">{r.system_quantity}</td>
                    <td className="text-right font-semibold">{r.actual_quantity}</td>
                    <td className={`text-right font-semibold ${r.difference > 0 ? "text-success" : r.difference < 0 ? "text-error" : ""}`}>
                      {r.difference > 0 ? "+" : ""}{r.difference}
                    </td>
                    <td className="text-xs text-base-content/60">{r.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
