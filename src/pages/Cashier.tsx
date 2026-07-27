import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import ProductSearch from "@/components/cashier/ProductSearch";
import CartItemRow from "@/components/cashier/CartItemRow";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { useScale } from "@/hooks/useScale";
import { formatRupiah } from "@/lib/currency";
import type { IItemDiscount } from "@/types/database";

interface SearchResultProduct {
  id: number;
  plu_code: string;
  barcode: string | null;
  name: string;
  description: string;
  category_id: number | null;
  base_unit: string;
  purchase_price: number;
  selling_price: number;
  stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  product: SearchResultProduct;
  total_stock: number;
}

export default function Cashier() {
  const navigate = useNavigate();
  const {
    items,
    subtotal,
    discountTotal,
    grandTotal,
    addItem,
    removeItem,
    updateQty,
    applyDiscount,
    applyPromoDiscounts,
    clearCart,
  } = useCartStore();
  const { scalePortName } = useUIStore();
  const { readScale } = useScale();

  const searchRef = useRef<HTMLInputElement | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<number | null>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [weighingTarget, setWeighingTarget] = useState<number | null>(null);
  const [weighing, setWeighing] = useState(false);
  const [weighingError, setWeighingError] = useState("");

  const recalcPromos = useCallback(
    async (cartItems: typeof items) => {
      if (cartItems.length === 0) return;
      try {
        const discountItems = cartItems.map((i) => ({
          product_id: i.product_id,
          category_id: i.category_id,
          quantity: i.quantity,
          selling_price: i.selling_price,
          subtotal: i.selling_price * i.quantity,
        }));
        const result = await invoke<IItemDiscount[]>("calculate_discounts", { items: discountItems });
        applyPromoDiscounts(result);
      } catch { /* promo not available */ }
    },
    [applyPromoDiscounts]
  );

  useEffect(() => { recalcPromos(items); }, [items.length, recalcPromos]);

  const handleSelectProduct = useCallback(
    async (result: SearchResult) => {
      const p = result.product;
      let conversions: { from_unit: string; to_unit: string; factor: number }[] = [];
      try { conversions = await invoke("get_unit_conversions", { productId: p.id }); } catch { /* ok */ }
      const hasConversions = conversions.length > 0;
      const selectedUnit = hasConversions ? conversions[0].to_unit : p.base_unit;
      const factor = hasConversions ? conversions[0].factor : 1;

      addItem({
        product_id: p.id,
        name: p.name,
        barcode: p.barcode ?? p.plu_code,
        plu_code: p.plu_code,
        category_id: p.category_id,
        quantity: 1,
        unit: selectedUnit,
        unit_conversion_factor: factor,
        base_quantity: factor,
        selling_price: p.selling_price,
        discount: 0,
        subtotal: p.selling_price,
        stock_batch_id: null,
        total_stock: result.total_stock,
        stock_threshold: p.stock_threshold,
        promo_name: "",
      });
    },
    [addItem]
  );

  const handleDiscountClick = (productId: number) => {
    const item = items.find((i) => i.product_id === productId);
    setDiscountTarget(productId);
    setDiscountValue(item?.discount ? String(item.discount) : "");
    setShowDiscountModal(true);
  };

  const applyDiscountConfirm = () => {
    if (discountTarget === null) return;
    const val = parseInt(discountValue) || 0;
    applyDiscount(discountTarget, val);
    setShowDiscountModal(false);
    setDiscountTarget(null);
  };

  const handleWeigh = async (productId: number) => {
    if (!scalePortName) return;
    setWeighingTarget(productId);
    setWeighing(true);
    setWeighingError("");
    try {
      const reading = await readScale();
      if (reading && reading.grams > 0) {
        const item = items.find((i) => i.product_id === productId);
        if (item) {
          const qtyInUnit = reading.grams / (item.unit_conversion_factor * 1000);
          const finalQty = Math.max(1, Math.round(qtyInUnit));
          updateQty(productId, finalQty);
        }
      } else {
        setWeighingError("Timbangan tidak membaca berat");
      }
    } catch {
      setWeighingError("Gagal membaca timbangan");
    } finally {
      setWeighing(false);
      setWeighingTarget(null);
    }
  };

  const handlePay = () => { navigate("/cashier/payment"); };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        navigate("/cashier");
        searchRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        if (showDiscountModal) {
          setShowDiscountModal(false);
        } else if (items.length > 0 && window.confirm("Batalkan transaksi?")) {
          clearCart();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, showDiscountModal, items.length, clearCart]);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      <div className="flex-1 flex flex-col p-4 gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ProductSearch onSelectProduct={handleSelectProduct} inputRef={searchRef} />
          </div>
          <span className="text-xs text-base-content/40 hidden lg:block">F2 Cari</span>
        </div>

        <div className="flex-1 bg-base-200 rounded-box p-4 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-base-content/40 text-lg">
              Scan atau cari produk untuk memulai transaksi
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-1">
                  <CartItemRow
                    item={item}
                    onUpdateQty={updateQty}
                    onRemove={removeItem}
                    onDiscount={handleDiscountClick}
                  />
                  {scalePortName && (
                    <button
                      className="btn btn-xs btn-ghost btn-square text-accent"
                      onClick={() => handleWeigh(item.product_id)}
                      disabled={weighing && weighingTarget === item.product_id}
                      title="Timbang"
                    >
                      {weighing && weighingTarget === item.product_id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM7.5 5.5a.5.5 0 011 0v1.5a.5.5 0 01-1 0V5.5zm4 0a.5.5 0 011 0v1.5a.5.5 0 01-1 0V5.5zM5.5 10a.5.5 0 010-1h1.5a.5.5 0 010 1H5.5zm7.5 0a.5.5 0 010-1h1.5a.5.5 0 010 1H13zm-6.5 2.5a.5.5 0 01.5-.5h6a.5.5 0 010 1H7a.5.5 0 01-.5-.5z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {weighingError && (
          <div className="alert alert-warning text-sm">
            <span>{weighingError}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setWeighingError("")}>x</button>
          </div>
        )}
      </div>

      <div className="w-96 bg-base-200 flex flex-col border-l border-base-300">
        <div className="p-4 space-y-3 flex-1">
          <h2 className="font-bold text-lg">Ringkasan</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-base-content/60">Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-error">
                <span>Diskon</span>
                <span>-{formatRupiah(discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-base-300">
              <span>Total</span>
              <span>{formatRupiah(grandTotal)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4 text-xs text-base-content/60">
            <span>{items.length} item dalam keranjang</span>
            <span className="hidden lg:block">Esc = Batal, F1 = Layar Kasir</span>
          </div>
        </div>

        <div className="p-4 space-y-2 border-t border-base-300">
          <button className="btn btn-primary w-full btn-lg" disabled={items.length === 0} onClick={handlePay}>
            Lanjut ke Pembayaran
          </button>
          {items.length > 0 && (
            <button className="btn btn-ghost btn-sm w-full" onClick={() => { if (window.confirm("Batalkan transaksi?")) clearCart(); }}>
              Batal
            </button>
          )}
        </div>
      </div>

      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDiscountModal(false)}>
          <div className="bg-base-100 rounded-box p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Input Diskon (Rp)</h3>
            <input
              type="number"
              className="input input-bordered w-full"
              placeholder="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDiscountModal(false)}>Batal</button>
              <button className="btn btn-primary btn-sm" onClick={applyDiscountConfirm}>Terapkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
