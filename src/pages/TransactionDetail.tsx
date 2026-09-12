import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { formatRupiah } from "@/lib/currency";
import { usePrinter } from "@/hooks/usePrinter";
import { useUIStore } from "@/stores/uiStore";
import { loadStoreProfile } from "@/lib/constants";

interface DetailItem {
  product_name: string;
  quantity: number;
  unit: string;
  selling_price: number;
  discount: number;
  subtotal: number;
}

interface Payment {
  id: number;
  method: string;
  amount: number;
  reference: string;
}

interface TransactionDetail {
  id: number;
  transaction_number: string;
  subtotal: number;
  discount_total: number;
  grand_total: number;
  payment_status: string;
  created_at: string;
  items: DetailItem[];
  payments: Payment[];
}

const methodLabel: Record<string, string> = { cash: "Tunai", qris: "QRIS", edc: "EDC" };

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { printReceipt } = usePrinter();
  const { printerName, currentUser } = useUIStore();
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState("");
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<"void" | "refund" | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await invoke<TransactionDetail>("get_transaction_detail", { id: parseInt(id) });
      setDetail(res);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleVoid = () => {
    if (!detail) return;
    setConfirmAction("void");
    setConfirmPassword("");
    setConfirmError("");
  };

  const handleRefund = () => {
    if (!detail) return;
    setConfirmAction("refund");
    setConfirmPassword("");
    setConfirmError("");
  };

  const handleConfirmAction = async () => {
    if (!detail || !confirmAction || !currentUser) return;
    if (!confirmPassword) {
      setConfirmError("Password harus diisi");
      return;
    }
    setConfirming(true);
    setConfirmError("");
    try {
      await invoke("login_user", {
        input: { username: currentUser.username, password: confirmPassword },
      });
      if (confirmAction === "void") {
        setVoiding(true);
        await invoke("void_transaction", { id: detail.id });
        toast.success("Transaksi di-void");
      } else {
        setRefunding(true);
        await invoke("refund_transaction", { id: detail.id });
        toast.success("Transaksi di-refund");
      }
      setConfirmAction(null);
      fetchDetail();
    } catch (err) {
      setConfirmError(String(err));
    } finally {
      setConfirming(false);
      setVoiding(false);
      setRefunding(false);
    }
  };

  const handleReprint = async () => {
    if (!detail) return;
    const profile = loadStoreProfile();
    setPrintStatus(null);
    const err = await printReceipt(
      profile.name,
      profile.address,
      detail.transaction_number,
      detail.created_at,
      detail.items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        unit: i.unit,
        total: i.subtotal,
        discount: i.discount || 0,
      })),
      detail.payments.map((p) => ({
        method_label: methodLabel[p.method] || p.method,
        amount: p.amount,
      })),
      detail.subtotal,
      detail.discount_total,
      detail.grand_total,
      detail.grand_total - detail.payments.reduce((s, p) => s + p.amount, 0)
    );
    setPrintStatus(err ? `Gagal: ${err}` : "Struk berhasil dicetak");
  };

  if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>;
  if (!detail) return <div className="p-8 text-center text-base-content/60">Transaksi tidak ditemukan</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/reports/transactions")}>← Kembali</button>
        <h1 className="text-2xl font-bold">Detail Transaksi</h1>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {printStatus && (
        <div className={`alert text-sm ${printStatus.includes("Gagal") ? "alert-warning" : "alert-success"}`}>
          <span>{printStatus}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-base-200 rounded-box p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-base-content/60">No. Transaksi</span>
          <span className="font-mono font-bold">{detail.transaction_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-base-content/60">Tanggal</span>
          <span>{detail.created_at}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-base-content/60">Status</span>
          <span className={`badge ${detail.payment_status === "completed" ? "badge-success" : "badge-ghost"}`}>
            {detail.payment_status}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="bg-base-200 rounded-box p-4">
        <h2 className="font-bold mb-3">Item</h2>
        <table className="table table-sm">
          <thead>
            <tr><th>Produk</th><th className="text-right">Qty</th><th className="text-right">Harga</th><th className="text-right">Diskon</th><th className="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            {detail.items.map((item, i) => (
              <tr key={i}>
                <td>{item.product_name}</td>
                <td className="text-right">{item.quantity} {item.unit}</td>
                <td className="text-right">{formatRupiah(item.selling_price)}</td>
                <td className="text-right">{item.discount > 0 ? formatRupiah(item.discount) : "-"}</td>
                <td className="text-right font-semibold">{formatRupiah(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payments */}
      <div className="bg-base-200 rounded-box p-4 space-y-2">
        <h2 className="font-bold mb-3">Pembayaran</h2>
        {detail.payments.map((p) => (
          <div key={p.id} className="flex justify-between text-sm">
            <span>{methodLabel[p.method] || p.method} {p.reference && <span className="text-xs text-base-content/60">({p.reference})</span>}</span>
            <span>{formatRupiah(p.amount)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="bg-base-200 rounded-box p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatRupiah(detail.subtotal)}</span>
        </div>
        {detail.discount_total > 0 && (
          <div className="flex justify-between text-error">
            <span>Diskon</span>
            <span>-{formatRupiah(detail.discount_total)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-base-300">
          <span>Grand Total</span>
          <span>{formatRupiah(detail.grand_total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {printerName && detail.payment_status === "completed" && (
          <button className="btn btn-outline flex-1" onClick={handleReprint}>
            Cetak Ulang
          </button>
        )}
        {detail.payment_status === "completed" && (
          <>
            <button className="btn btn-error flex-1" disabled={voiding} onClick={handleVoid}>
              {voiding ? <span className="loading loading-spinner" /> : "Void (Stok Kembali)"}
            </button>
            <button className="btn btn-warning flex-1" disabled={refunding} onClick={handleRefund}>
              {refunding ? <span className="loading loading-spinner" /> : "Refund (Stok Hangus)"}
            </button>
          </>
        )}
      </div>

      {/* Password Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmAction(null)}>
          <div className="bg-base-100 rounded-box p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">
              {confirmAction === "void" ? "Void Transaksi" : "Refund Transaksi"}
            </h3>
            <p className="text-sm text-base-content/60 mb-4">
              {confirmAction === "void"
                ? "Masukkan password untuk mem-void transaksi ini. Stok akan dikembalikan."
                : "Masukkan password untuk me-refund transaksi ini. Stok TIDAK akan dikembalikan."}
            </p>
            {confirmError && <div className="alert alert-error text-sm mb-3"><span>{confirmError}</span></div>}
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder="Password Anda"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmAction(); }}
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Batal</button>
              <button className={`btn ${confirmAction === "void" ? "btn-error" : "btn-warning"}`} disabled={confirming} onClick={handleConfirmAction}>
                {confirming ? <span className="loading loading-spinner" /> : confirmAction === "void" ? "Void" : "Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
