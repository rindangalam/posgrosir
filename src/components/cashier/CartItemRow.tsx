import type { ICartItem } from "@/types/database";
import { formatRupiah } from "@/lib/currency";

interface Props {
  item: ICartItem;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemove: (productId: number) => void;
  onDiscount: (productId: number) => void;
}

export default function CartItemRow({ item, onUpdateQty, onRemove, onDiscount }: Props) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-base-200 rounded-lg group">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate flex items-center gap-2">
          {item.name}
          {item.promo_name && (
            <span className="badge badge-xs badge-warning shrink-0">Promo</span>
          )}
          {item.total_stock <= item.stock_threshold && (
            <span className="badge badge-xs badge-error shrink-0">Stok Menipis</span>
          )}
        </div>
        <div className="text-xs text-base-content/60">
          @{formatRupiah(item.selling_price)} / {item.unit}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="btn btn-xs btn-ghost btn-square"
          onClick={() => item.quantity > 1 && onUpdateQty(item.product_id, item.quantity - 1)}
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          className="btn btn-xs btn-ghost btn-square"
          onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
        >
          +
        </button>
      </div>

      <div className="text-right w-24">
        <div className="text-sm font-semibold">{formatRupiah(item.subtotal)}</div>
        {item.discount > 0 && (
          <div className="text-xs text-error">-{formatRupiah(item.discount)}</div>
        )}
      </div>

      <button
        className="btn btn-xs btn-ghost btn-square text-info"
        onClick={() => onDiscount(item.product_id)}
        title="Diskon manual"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l.707.707.707-.707A1 1 0 0115 3v5a1 1 0 11-2 0V3a1 1 0 01-1-1zm-3 10a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H9a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>

      <button
        className="btn btn-xs btn-ghost btn-square opacity-0 group-hover:opacity-100 transition-opacity text-error"
        onClick={() => onRemove(item.product_id)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
