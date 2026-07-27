import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Receipt } from "@phosphor-icons/react";
import { formatRupiah } from "@/lib/currency";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface TransactionBrief {
  id: number; transaction_number: string; grand_total: number;
  payment_status: string; payment_methods: string; created_at: string;
}

const methodLabel: Record<string, string> = { cash: "Tunai", qris: "QRIS", edc: "EDC" };

export default function TransactionHistory() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [method, setMethod] = useState("");
  const [transactions, setTransactions] = useState<TransactionBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchTrx = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke<TransactionBrief[]>("list_transactions", {
        startDate: startDate || undefined, endDate: endDate || undefined,
        method: method || undefined, page, limit,
      });
      setTransactions(res);
    } catch { setTransactions([]); }
    finally { setLoading(false); }
  }, [startDate, endDate, method, page]);

  useEffect(() => { fetchTrx(); }, [fetchTrx]);

  return (
    <div className="space-y-4">
      <PageHeader icon={Receipt} title="Riwayat Transaksi" subtitle="Lihat dan kelola transaksi" />

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="label py-1"><span className="label-text">Dari</span></label>
          <input type="date" className="input input-bordered input-sm" value={startDate} max={today}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label py-1"><span className="label-text">Sampai</span></label>
          <input type="date" className="input input-bordered input-sm" value={endDate} max={today}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label py-1"><span className="label-text">Metode</span></label>
          <select className="select select-bordered select-sm" value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="">Semua</option>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="edc">EDC</option>
          </select>
        </div>
      </div>

      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="Tidak ada transaksi"
            description="Belum ada transaksi untuk filter ini. Coba ubah tanggal atau metode pembayaran." />
        ) : (
          <table className="table table-zebra">
            <thead>
              <tr><th>No. Transaksi</th><th>Tanggal</th><th>Metode</th><th className="text-right">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-base-300"
                  onClick={() => navigate(`/reports/transactions/${t.id}`)}>
                  <td className="font-mono text-xs">{t.transaction_number}</td>
                  <td className="text-xs">{t.created_at}</td>
                  <td className="text-xs">{t.payment_methods.split(",").map((m) => methodLabel[m.trim()] || m.trim()).join(", ")}</td>
                  <td className="text-right font-semibold">{formatRupiah(t.grand_total)}</td>
                  <td><span className={`badge badge-sm ${t.payment_status === "completed" ? "badge-success" : "badge-ghost"}`}>{t.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
        <span className="btn btn-sm btn-disabled">Halaman {page}</span>
        <button className="btn btn-sm" disabled={transactions.length < limit} onClick={() => setPage((p) => p + 1)}>Selanjutnya</button>
      </div>
    </div>
  );
}