import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { ChartBar, Coins, TrendUp, ShoppingCart, CurrencyDollar, Download, Printer } from "@phosphor-icons/react";
import { formatRupiah } from "@/lib/currency";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

interface DailySummary {
  total_transactions: number; gross_sales: number; total_discounts: number;
  net_sales: number; total_cash: number; total_qris: number; total_edc: number; average_per_trx: number;
}

interface TopProduct { id: number; name: string; total_qty: number; total_revenue: number; }
interface LowStockProduct { id: number; plu_code: string; name: string; total_stock: number; stock_threshold: number; base_unit: string; }

export default function DailyReport() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");

  const fetchData = useCallback(async (d: string) => {
    setLoading(true); setGenMsg("");
    try {
      const [sum, top, low] = await Promise.all([
        invoke<DailySummary>("get_daily_summary", { date: d }),
        invoke<TopProduct[]>("get_top_products", { date: d }),
        invoke<LowStockProduct[]>("get_low_stock_products"),
      ]);
      setSummary(sum); setTopProducts(top); setLowStock(low);
    } catch { setSummary(null); toast.error("Gagal memuat data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  const handleGenerate = async () => {
    setGenerating(true); setGenMsg("");
    try {
      const res = await invoke<{ date: string; total_transactions: number; net_sales: number }>("generate_daily_summary", { date });
      setGenMsg(`Daily summary ${res.date} tersimpan: ${res.total_transactions} transaksi, ${formatRupiah(res.net_sales)} omzet`);
      fetchData(date);
    } catch (err) { setGenMsg("Error: " + String(err)); }
    finally { setGenerating(false); }
  };

  const handleExportCsv = async () => {
    try {
      const filePath = prompt("Simpan CSV ke path (contoh: C:\\Users\\user\\Desktop\\laporan.csv):");
      if (!filePath) return;
      await invoke("export_report_csv", { reportType: "daily", date, filePath });
      setGenMsg(`CSV tersimpan di ${filePath}`);
    } catch (err) { setGenMsg("Error: " + String(err)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ChartBar} title="Laporan Harian" subtitle="Ringkasan omzet, transaksi, dan stok">
        <input type="date" className="input input-bordered w-44" value={date} max={today}
          onChange={(e) => setDate(e.target.value)} />
      </PageHeader>

      {genMsg && <div className={`alert ${genMsg.startsWith("Error") ? "alert-error" : "alert-success"}`}><span>{genMsg}</span></div>}

      {loading ? (
        <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
      ) : !summary ? (
        <div className="p-8 text-center text-base-content/60">Tidak ada data untuk tanggal ini. Generate daily summary untuk melihat data.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ShoppingCart} label="Total Transaksi" value={String(summary.total_transactions)} color="primary" />
            <StatCard icon={TrendUp} label="Omzet (Gross)" value={formatRupiah(summary.gross_sales)} color="success" />
            <StatCard icon={CurrencyDollar} label="Rata-rata / Trx" value={formatRupiah(summary.average_per_trx)} color="info" />
            <StatCard icon={ChartBar} label="Total Diskon" value={formatRupiah(summary.total_discounts)} color="error" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Coins} label="Tunai" value={formatRupiah(summary.total_cash)} color="success" />
            <StatCard icon={Coins} label="QRIS" value={formatRupiah(summary.total_qris)} color="info" />
            <StatCard icon={Coins} label="EDC" value={formatRupiah(summary.total_edc)} color="warning" />
          </div>

          <div className="bg-base-200 rounded-box p-4">
            <h2 className="font-heading font-bold mb-3">Ringkasan per Metode Bayar</h2>
            <table className="table table-sm">
              <thead><tr><th>Metode</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {[
                  { label: "Tunai", value: summary.total_cash },
                  { label: "QRIS", value: summary.total_qris },
                  { label: "EDC", value: summary.total_edc },
                  { label: "Grand Total", value: summary.net_sales, bold: true },
                ].map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className={`text-right ${r.bold ? "font-bold" : ""}`}>{formatRupiah(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-base-200 rounded-box p-4">
            <h2 className="font-heading font-bold mb-3">Item Terlaris</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-base-content/60">Belum ada transaksi</p>
            ) : (
              <table className="table table-sm">
                <thead><tr><th>#</th><th>Nama</th><th className="text-right">Qty Terjual</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.id}>
                      <td className="text-xs">{i + 1}</td>
                      <td>{p.name}</td>
                      <td className="text-right">{p.total_qty}</td>
                      <td className="text-right">{formatRupiah(p.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {lowStock.length > 0 && (
            <div className="bg-base-200 rounded-box p-4">
              <h2 className="font-heading font-bold mb-3 text-error">Stok Menipis</h2>
              <table className="table table-sm">
                <thead><tr><th>Produk</th><th className="text-right">Stok</th><th className="text-right">Threshold</th></tr></thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name} <span className="text-xs text-base-content/60">({p.plu_code})</span></td>
                      <td className="text-right text-error font-semibold">{p.total_stock} {p.base_unit}</td>
                      <td className="text-right">{p.stock_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" disabled={!summary} onClick={handleExportCsv}>
              <Download size={18} /> Export CSV
            </button>
            <button className="btn btn-outline" disabled={!summary} onClick={() => window.print()}>
              <Printer size={18} /> Cetak / PDF
            </button>
            <button className="btn btn-primary" disabled={generating} onClick={handleGenerate}>
              {generating ? <span className="loading loading-spinner" /> : "Generate & Tutup Kasir"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}