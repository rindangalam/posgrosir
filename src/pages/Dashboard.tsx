import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  ChartPieSlice, ShoppingCart, TrendUp, Cube,
  Warning, Database, CheckCircle, XCircle,
} from "@phosphor-icons/react";
import { formatRupiah } from "@/lib/currency";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

interface DbInfo {
  tables: string[];
  status: "loading" | "ok" | "error";
}

interface DashboardStats {
  today_omzet: number;
  today_transactions: number;
  total_products: number;
  low_stock_count: number;
}

interface RecentTransaction {
  id: number;
  transaction_number: string;
  grand_total: number;
  payment_status: string;
  payment_methods: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dbInfo, setDbInfo] = useState<DbInfo>({ tables: [], status: "loading" });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTrx, setRecentTrx] = useState<RecentTransaction[]>([]);

  useEffect(() => {
    invoke<string[]>("check_db")
      .then((tables) => setDbInfo({ tables, status: "ok" }))
      .catch(() => setDbInfo({ tables: [], status: "error" }));
    invoke<DashboardStats>("get_dashboard_stats")
      .then(setStats)
      .catch(() => setStats(null));
    invoke<RecentTransaction[]>("list_transactions", { limit: 5, page: 1 })
      .then(setRecentTrx)
      .catch(() => setRecentTrx([]));
  }, []);

  const statCards = [
    { icon: ShoppingCart, label: "Omzet Hari Ini", value: stats ? formatRupiah(stats.today_omzet) : "Rp 0", color: "primary" as const },
    { icon: TrendUp, label: "Transaksi Hari Ini", value: stats ? String(stats.today_transactions) : "0", color: "success" as const },
    { icon: Cube, label: "Total Produk", value: stats ? String(stats.total_products) : "0", color: "secondary" as const },
    { icon: Warning, label: "Stok Menipis", value: stats ? String(stats.low_stock_count) : "0", color: "error" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ChartPieSlice}
        title="Dashboard"
        subtitle="Ringkasan bisnis hari ini"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-200 rounded-box p-4">
          <h2 className="font-heading font-bold mb-3">Aktivitas Terkini</h2>
          {recentTrx.length === 0 ? (
            <p className="text-sm text-base-content/60">Belum ada transaksi hari ini</p>
          ) : (
            <div className="space-y-2">
              {recentTrx.map((t) => (
                <button
                  key={t.id}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-base-300 text-sm text-left transition-colors"
                  onClick={() => navigate(`/reports/transactions/${t.id}`)}
                >
                  <div>
                    <span className="font-mono text-xs text-base-content/60">{t.transaction_number}</span>
                    <span className="ml-2 text-xs text-base-content/50">{t.payment_methods}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatRupiah(t.grand_total)}</span>
                    <span className={`badge badge-xs ${
                      t.payment_status === "completed" ? "badge-success" :
                      t.payment_status === "voided" ? "badge-error" : "badge-warning"
                    }`}>
                      {t.payment_status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bg-base-200 rounded-box p-4">
          <h2 className="font-heading font-bold mb-3">Status Sistem</h2>
          <div className="flex items-center gap-3">
            <Database size={20} className="text-primary" weight="fill" />
            <div>
              <p className="font-medium">Database</p>
              {dbInfo.status === "loading" && (
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <span className="loading loading-spinner loading-xs" />
                  Memeriksa koneksi...
                </div>
              )}
              {dbInfo.status === "ok" && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle size={16} weight="fill" />
                  Terhubung ({dbInfo.tables.length} tabel)
                </div>
              )}
              {dbInfo.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-error">
                  <XCircle size={16} weight="fill" />
                  Tidak terhubung
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {dbInfo.tables.map((t) => (
              <span key={t} className="badge badge-sm badge-outline">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
