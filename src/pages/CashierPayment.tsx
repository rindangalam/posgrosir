import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Money, QrCode, CreditCard } from "@phosphor-icons/react";
import { useCartStore, calcGrandTotal } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { formatRupiah } from "@/lib/currency";
import type { ITransactionResult } from "@/types/database";

interface PaymentEntry {
  method: "cash" | "qris" | "edc";
  label: string;
  color: string;
  amount: string;
  reference: string;
}

const methodIcons: Record<string, React.ReactNode> = {
  cash: <Money size={20} weight="fill" />,
  qris: <QrCode size={20} weight="fill" />,
  edc: <CreditCard size={20} weight="fill" />,
};

export default function CashierPayment() {
  const navigate = useNavigate();
  const { items, subtotal, discountTotal, setLastTransaction } = useCartStore();
  const { taxRate } = useUIStore();
  const grandTotal = calcGrandTotal(subtotal, discountTotal, taxRate);

  const [payments, setPayments] = useState<PaymentEntry[]>([
    { method: "cash", label: "Tunai", color: "success", amount: "", reference: "" },
    { method: "qris", label: "QRIS", color: "info", amount: "", reference: "" },
    { method: "edc", label: "EDC/Debit", color: "warning", amount: "", reference: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) {
    navigate("/cashier", { replace: true });
    return null;
  }

  const totalPaid = payments.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
  const remaining = grandTotal - totalPaid;
  const cashAmount = parseInt(payments[0].amount) || 0;
  const nonCashTotal = payments.slice(1).reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
  const change = cashAmount - Math.max(0, grandTotal - nonCashTotal);
  const canPay = totalPaid >= grandTotal && change >= 0;

  const updatePayment = (index: number, field: "amount" | "reference", value: string) => {
    setPayments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setError("");
  };

  const handlePay = async () => {
    if (!canPay || saving) return;
    setSaving(true);
    setError("");

    const activePayments = payments
      .filter((p) => parseInt(p.amount) > 0)
      .map((p) => ({
        method: p.method,
        amount: parseInt(p.amount),
        reference: p.reference,
      }));

    const input = {
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit: i.unit,
        unit_conversion_factor: i.unit_conversion_factor,
        base_quantity: i.base_quantity,
        selling_price: i.selling_price,
        discount: i.discount,
        subtotal: i.subtotal,
      })),
      payments: activePayments,
    };

    try {
      const result = await invoke<ITransactionResult>("create_transaction", { input });
      setLastTransaction(result);
      navigate("/cashier/success", { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/cashier")}>
          ← Kembali
        </button>
        <h1 className="text-2xl font-bold">Pilih Pembayaran</h1>
      </div>

      {/* Grand total display */}
      <div className="bg-base-200 rounded-box p-6 text-center">
        <p className="text-sm text-base-content/60">Total Pembayaran</p>
        <p className="text-4xl font-bold mt-1">{formatRupiah(grandTotal)}</p>
        {discountTotal > 0 && (
          <p className="text-sm text-error mt-1">Diskon: -{formatRupiah(discountTotal)}</p>
        )}
      </div>

      {/* Remaining indicator */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-base-content/60">Sisa yang harus dibayar</span>
        <span className={`text-xl font-bold ${remaining <= 0 ? "text-success" : ""}`}>
          {remaining <= 0 ? "Lunas" : formatRupiah(remaining)}
        </span>
      </div>

      {/* Payment method panels */}
      <div className="space-y-3">
        {payments.map((pay, idx) => (
          <div key={pay.method} className={`bg-base-200 rounded-box p-4 border-l-4 border-${pay.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold flex items-center gap-2">
                {methodIcons[pay.method]} {pay.label}
              </span>
              <span className="text-lg font-bold">
                {parseInt(pay.amount) > 0 ? formatRupiah(parseInt(pay.amount)) : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered flex-1 text-right text-lg"
                placeholder="0"
                value={pay.amount}
                onChange={(e) => updatePayment(idx, "amount", e.target.value)}
              />
              {pay.method === "qris" && (
                <input
                  type="text"
                  className="input input-bordered w-32 text-sm"
                  placeholder="Ref"
                  value={pay.reference}
                  onChange={(e) => updatePayment(idx, "reference", e.target.value)}
                />
              )}
              {pay.method === "edc" && (
                <input
                  type="text"
                  className="input input-bordered w-32 text-sm"
                  placeholder="Ref"
                  value={pay.reference}
                  onChange={(e) => updatePayment(idx, "reference", e.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Change display */}
      {totalPaid >= grandTotal && change >= 0 && (
        <div className="bg-success/10 rounded-box p-4 text-center">
          <p className="text-sm text-base-content/60">Kembalian</p>
          <p className="text-3xl font-bold text-success">{formatRupiah(change)}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          className="btn btn-primary w-full btn-lg"
          disabled={!canPay || saving}
          onClick={handlePay}
        >
          {saving ? (
            <span className="loading loading-spinner" />
          ) : (
            `Bayar ${formatRupiah(grandTotal)}`
          )}
        </button>
        <button className="btn btn-ghost w-full" onClick={() => navigate("/cashier")}>
          Batal
        </button>
      </div>
    </div>
  );
}
