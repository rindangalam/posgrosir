import { create } from "zustand";
import type { ICartItem, IItemDiscount, ITransactionResult } from "@/types/database";

function recalculate(items: ICartItem[]) {
  const subtotal = items.reduce((sum, i) => sum + i.selling_price * i.quantity, 0);
  const discountTotal = items.reduce((sum, i) => sum + i.discount, 0);
  const itemsWithSubtotal = items.map((i) => ({
    ...i,
    subtotal: i.selling_price * i.quantity - i.discount,
  }));
  return { items: itemsWithSubtotal, subtotal, discountTotal };
}

interface CartState {
  items: ICartItem[];
  subtotal: number;
  discountTotal: number;
  lastTransaction: ITransactionResult | null;

  addItem: (item: ICartItem) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  applyDiscount: (productId: number, discount: number) => void;
  applyPromoDiscounts: (discounts: IItemDiscount[]) => void;
  clearCart: () => void;
  setLastTransaction: (trx: ITransactionResult | null) => void;
}

function calcGrandTotal(subtotal: number, discountTotal: number, taxRate: number) {
  const afterDiscount = subtotal - discountTotal;
  const tax = Math.round(afterDiscount * taxRate / 100);
  return afterDiscount + tax;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  subtotal: 0,
  discountTotal: 0,
  lastTransaction: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id);
      if (existing) {
        const newItems = state.items.map((i) =>
          i.product_id === item.product_id
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                base_quantity: i.base_quantity + item.base_quantity,
                discount: 0,
                promo_name: "",
              }
            : i
        );
        return recalculate(newItems);
      }
      return recalculate([...state.items, item]);
    }),

  removeItem: (productId) =>
    set((state) => recalculate(state.items.filter((i) => i.product_id !== productId))),

  updateQty: (productId, qty) =>
    set((state) => {
      const newItems = state.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity: qty, base_quantity: qty * i.unit_conversion_factor, discount: 0, promo_name: "" }
          : i
      );
      return recalculate(newItems);
    }),

  applyDiscount: (productId, discount) =>
    set((state) => {
      const newItems = state.items.map((i) =>
        i.product_id === productId
          ? { ...i, discount, subtotal: i.quantity * i.selling_price - discount }
          : i
      );
      return recalculate(newItems);
    }),

  applyPromoDiscounts: (discounts) =>
    set((state) => {
      const map = new Map(discounts.map((d) => [d.product_id, d]));
      const newItems = state.items.map((item) => {
        const promo = map.get(item.product_id);
        if (promo && promo.discount > 0) {
          return {
            ...item,
            discount: promo.discount,
            promo_name: promo.promo_name,
          };
        }
        return item;
      });
      return recalculate(newItems);
    }),

  clearCart: () =>
    set({ items: [], subtotal: 0, discountTotal: 0 }),

  setLastTransaction: (trx) => set({ lastTransaction: trx }),
}));

export { calcGrandTotal };
