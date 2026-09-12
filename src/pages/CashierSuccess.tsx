import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { usePrinter, addToPrintQueue } from "@/hooks/usePrinter";
import { formatRupiah } from "@/lib/currency";
import { formatReceipt } from "@/lib/receipt";
import { loadStoreProfile } from "@/lib/constants";

const methodLabel: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  edc: "EDC/Debit",
};

export default function CashierSuccess() {
  const navigate = useNavigate();
  const { items, lastTransaction, clearCart } = useCartStore();
  const { autoPrint, openDrawer, printerName } = useUIStore();
  const { printReceipt } = usePrinter();
  const [showReceipt, setShowReceipt] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const printed = useRef(false);

  useEffect(() => {
    if (!lastTransaction) {
      navigate("/cashier", { replace: true });
      return;
    }

    if (autoPrint && printerName && !printed.current) {
      printed.current = true;
      (async () => {
        const getDetail = async () => {
          try {
            const detail: any = await invoke("get_transaction_detail", { id: lastTransaction!.id });
            return detail;
          } catch {
            return null;
          }
        };

        const detail = await getDetail();
        const printItems = (detail?.items || []).map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          unit: i.unit,
          total: i.subtotal,
          discount: i.discount || 0,
        }));

        const profile = loadStoreProfile();
        const err = await printReceipt(
          profile.name,
          profile.address,
          lastTransaction!.transaction_number,
          lastTransaction!.created_at,
          printItems,
          lastTransaction!.payments.map((p) => ({
            method_label: methodLabel[p.method] || p.method,
            amount: p.amount,
          })),
          lastTransaction!.subtotal,
          lastTransaction!.discount_total,
          lastTransaction!.grand_total,
          lastTransaction!.change
        );

        if (err) {
          setPrintStatus(`Gagal cetak: ${err}. Tersimpan di antrian.`);
          addToPrintQueue({
            storeName: profile.name,
            storeAddress: profile.address,
            transactionNumber: lastTransaction!.transaction_number,
            date: lastTransaction!.created_at,
            items: printItems,
            payments: lastTransaction!.payments.map((p) => ({
              method_label: methodLabel[p.method] || p.method,
              amount: p.amount,
            })),
            subtotal: lastTransaction!.subtotal,
            discountTotal: lastTransaction!.discount_total,
            grandTotal: lastTransaction!.grand_total,
            change: lastTransaction!.change,
          });
        }
      })();
    }
  }, [lastTransaction, navigate, autoPrint, printerName, printReceipt]);

  if (!lastTransaction) return null;

  const handleNewTransaction = () => {
    clearCart();
    navigate("/cashier");
  };

  const handleManualPrint = async () => {
    try {
      const detail: any = await invoke("get_transaction_detail", { id: lastTransaction.id });
      const printItems = (detail?.items || []).map((i: any) => ({
        name: i.product_name,
        quantity: i.quantity,
        unit: i.unit,
        total: i.subtotal,
        discount: i.discount || 0,
      }));

      const profile = loadStoreProfile();
      const err = await printReceipt(
        profile.name,
        profile.address,
        lastTransaction.transaction_number,
        lastTransaction.created_at,
        printItems,
        lastTransaction.payments.map((p) => ({
          method_label: methodLabel[p.method] || p.method,
          amount: p.amount,
        })),
        lastTransaction.subtotal,
        lastTransaction.discount_total,
        lastTransaction.grand_total,
        lastTransaction.change
      );
      setPrintStatus(err ? `Gagal cetak: ${err}` : "Struk berhasil dicetak");
    } catch {
      setPrintStatus("Gagal mengambil detail transaksi");
    }
  };

  const profile = loadStoreProfile();
  const receiptText = formatReceipt({
    storeName: profile.name,
    storeAddress: profile.address,
    transactionNumber: lastTransaction.transaction_number,
    date: lastTransaction.created_at,
    items: items.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      barcode: i.barcode,
      plu_code: i.plu_code,
      category_id: i.category_id,
      quantity: i.quantity,
      unit: i.unit,
      unit_conversion_factor: i.unit_conversion_factor,
      base_quantity: i.base_quantity,
      selling_price: i.selling_price,
      discount: i.discount,
      subtotal: i.subtotal,
      stock_batch_id: i.stock_batch_id,
      total_stock: i.total_stock,
      stock_threshold: i.stock_threshold,
      promo_name: i.promo_name,
    })),
    payments: lastTransaction.payments.map((p) => ({
      method: methodLabel[p.method] || p.method,
      amount: p.amount,
    })),
    subtotal: lastTransaction.subtotal,
    discountTotal: lastTransaction.discount_total,
    grandTotal: lastTransaction.grand_total,
    change: lastTransaction.change,
  });

  return (
    <>
      <div className="max-w-lg mx-auto p-6 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-success" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Transaksi Berhasil</h1>

        {printStatus && (
          <div className={`alert text-sm ${printStatus.includes("Gagal") ? "alert-warning" : "alert-success"}`}>
            <span>{printStatus}</span>
          </div>
        )}

        <div className="bg-base-200 rounded-box p-6 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-base-content/60">No. Transaksi</span>
            <span className="font-mono font-bold">{lastTransaction.transaction_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Tanggal</span>
            <span>{lastTransaction.created_at}</span>
          </div>
          <div className="divider my-1" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(lastTransaction.subtotal)}</span>
          </div>
          {lastTransaction.discount_total > 0 && (
            <div className="flex justify-between text-error">
              <span>Diskon</span>
              <span>-{formatRupiah(lastTransaction.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-base-300">
            <span>Total</span>
            <span>{formatRupiah(lastTransaction.grand_total)}</span>
          </div>
          <div className="divider my-1" />
          <div className="text-sm font-semibold mb-1">Pembayaran</div>
          {lastTransaction.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span>{methodLabel[p.method] || p.method}</span>
              <span>{formatRupiah(p.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span>Total Bayar</span>
            <span className="font-semibold">{formatRupiah(lastTransaction.amount_paid)}</span>
          </div>
          {lastTransaction.change > 0 && (
            <div className="flex justify-between text-success font-semibold">
              <span>Kembali</span>
              <span>{formatRupiah(lastTransaction.change)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {printerName && (
            <button className="btn btn-outline w-full" onClick={handleManualPrint}>
              Cetak Struk
            </button>
          )}
          <button className="btn btn-outline w-full" onClick={() => setShowReceipt(true)}>
            Lihat Struk
          </button>
          <button className="btn btn-primary w-full btn-lg" onClick={handleNewTransaction}>
            Transaksi Baru
          </button>
        </div>
      </div>

      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReceipt(false)}>
          <div className="bg-base-100 rounded-box p-6 w-96 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Preview Struk</h3>
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowReceipt(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <pre className="font-mono text-xs leading-tight whitespace-pre bg-base-200 p-3 rounded-box overflow-x-auto">{receiptText}</pre>
          </div>
        </div>
      )}
    </>
  );
}
