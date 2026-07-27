import { invoke } from "@tauri-apps/api/core";

export function useDatabase() {
  const searchProducts = async (query: string) => {
    try {
      return await invoke("search_products", { query });
    } catch (err) {
      console.error("Search failed:", err);
      return [];
    }
  };

  const createTransaction = async (data: unknown) => {
    try {
      return await invoke("create_transaction", { data });
    } catch (err) {
      console.error("Transaction failed:", err);
      throw err;
    }
  };

  return { searchProducts, createTransaction };
}
