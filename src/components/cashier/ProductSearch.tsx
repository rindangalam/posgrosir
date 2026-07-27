import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { formatRupiah } from "@/lib/currency";

interface SearchResult {
  product: {
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
  };
  total_stock: number;
}

interface Props {
  onSelectProduct: (product: SearchResult) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ProductSearch({ onSelectProduct, inputRef }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await invoke<SearchResult[]>("search_products", { query: q.trim() });
      setResults(res);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    onSelectProduct(item);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="input input-bordered flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          className="grow"
          placeholder="Scan barcode / ketik PLU atau nama produk..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {loading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-50" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        )}
      </label>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-box shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.product.id}
              className="w-full text-left px-4 py-3 hover:bg-base-200 border-b border-base-200 last:border-0 flex items-center justify-between gap-4"
              onClick={() => handleSelect(item)}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{item.product.name}</div>
                <div className="text-xs text-base-content/60">
                  {item.product.barcode ? `Barcode: ${item.product.barcode}` : `PLU: ${item.product.plu_code}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{formatRupiah(item.product.selling_price)}</div>
                <div className={`text-xs ${item.total_stock <= item.product.stock_threshold ? "text-error" : "text-base-content/60"}`}>
                  Stok: {item.total_stock} {item.product.base_unit}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-box shadow-xl z-50 p-4 text-center text-base-content/60">
          Produk tidak ditemukan
        </div>
      )}
    </div>
  );
}
