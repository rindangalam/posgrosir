import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";

export interface PrinterInfo {
  name: string;
  driver: string;
  port: string;
}

export interface PrintItem {
  name: string;
  quantity: number;
  unit: string;
  total: number;
  discount: number;
}

export interface PrintPayment {
  method_label: string;
  amount: number;
}

function getPrinterSettings() {
  try {
    const raw = localStorage.getItem("posgrosir_printer_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { printerName: "", paperWidth: 48, autoPrint: true, openDrawer: true };
}

function savePrinterSettings(settings: { printerName: string; paperWidth: number; autoPrint: boolean; openDrawer: boolean }) {
  localStorage.setItem("posgrosir_printer_settings", JSON.stringify(settings));
}

export function usePrinter() {
  const listPrinters = useCallback(async (): Promise<PrinterInfo[]> => {
    try {
      return await invoke<PrinterInfo[]>("list_printers");
    } catch {
      return [];
    }
  }, []);

  const printReceipt = useCallback(
    async (
      storeName: string,
      storeAddress: string,
      transactionNumber: string,
      date: string,
      items: PrintItem[],
      payments: PrintPayment[],
      subtotal: number,
      discountTotal: number,
      grandTotal: number,
      change: number
    ): Promise<string | null> => {
      const settings = getPrinterSettings();
      if (!settings.printerName) return "Printer belum dipilih";
      try {
        await invoke("print_receipt", {
          printerName: settings.printerName,
          storeName,
          storeAddress,
          transactionNumber,
          date,
          items: items.map((i) => ({ ...i, discount: i.discount ?? 0 })),
          payments: payments.map((p) => ({ method_label: p.method_label, amount: p.amount })),
          subtotal,
          discountTotal,
          grandTotal,
          change,
          paperWidth: settings.paperWidth,
          openDrawer: settings.openDrawer,
        });
        return null;
      } catch (err) {
        return String(err);
      }
    },
    []
  );

  const testPrint = useCallback(async (printerName: string): Promise<string | null> => {
    try {
      await invoke("test_print", { printerName });
      return null;
    } catch (err) {
      return String(err);
    }
  }, []);

  return { listPrinters, printReceipt, testPrint, getPrinterSettings, savePrinterSettings };
}

export function addToPrintQueue(data: {
  storeName: string;
  storeAddress: string;
  transactionNumber: string;
  date: string;
  items: PrintItem[];
  payments: PrintPayment[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  change: number;
}) {
  try {
    const raw = localStorage.getItem("posgrosir_print_queue");
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...data, queuedAt: new Date().toISOString() });
    localStorage.setItem("posgrosir_print_queue", JSON.stringify(queue));
  } catch {}
}

export function getPrintQueue(): any[] {
  try {
    const raw = localStorage.getItem("posgrosir_print_queue");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPrintQueue() {
  localStorage.removeItem("posgrosir_print_queue");
}
