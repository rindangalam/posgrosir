import type { ICartItem } from "@/types/database";

interface PaymentDisplay {
  method: string;
  amount: number;
}

interface ReceiptData {
  storeName: string;
  storeAddress: string;
  transactionNumber: string;
  date: string;
  items: ICartItem[];
  payments: PaymentDisplay[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  change: number;
}

export function formatReceipt(data: ReceiptData, paperWidth: 58 | 80 = 80): string {
  const lines: string[] = [];
  const w = paperWidth === 58 ? 32 : 48;

  const padCenter = (text: string, width: number) => {
    const pad = Math.max(0, width - text.length);
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return " ".repeat(left) + text + " ".repeat(right);
  };

  const padRight = (text: string, width: number) => {
    const pad = Math.max(0, width - text.length);
    return text + " ".repeat(pad);
  };

  const padLeft = (text: string, width: number) => {
    const pad = Math.max(0, width - text.length);
    return " ".repeat(pad) + text;
  };

  const nameW = w - 14;
  const qtyW = 6;
  const priceW = 8;

  lines.push(padCenter(data.storeName, w));
  lines.push(padCenter(data.storeAddress, w));
  lines.push("=".repeat(w));
  lines.push(`No: ${data.transactionNumber}`);
  lines.push(`Tgl: ${data.date}`);
  lines.push("-".repeat(w));
  lines.push(padRight("Nama Item", nameW) + padRight("Qty", qtyW) + padLeft("Harga", priceW));
  lines.push("-".repeat(w));

  for (const item of data.items) {
    const name = item.name.length > nameW - 2 ? item.name.substring(0, nameW - 2) + ".." : item.name;
    const qtyStr = `${item.quantity} ${item.unit}`;
    const subStr = `Rp${item.subtotal}`;
    lines.push(padRight(name, nameW) + padRight(qtyStr, qtyW) + padLeft(subStr, priceW));
    if (item.discount > 0) {
      lines.push(padRight("  Diskon:", w - priceW) + padLeft(`-Rp${item.discount}`, priceW));
    }
  }

  lines.push("-".repeat(w));
  lines.push(padRight("Subtotal:", w - priceW) + padLeft(`Rp${data.subtotal}`, priceW));
  if (data.discountTotal > 0) {
    lines.push(padRight("Diskon:", w - priceW) + padLeft(`-Rp${data.discountTotal}`, priceW));
  }
  lines.push(padRight("Grand Total:", w - priceW) + padLeft(`Rp${data.grandTotal}`, priceW));
  lines.push("=".repeat(w));
  lines.push("Pembayaran:");
  for (const p of data.payments) {
    lines.push(padRight(`  ${p.method.toUpperCase()}:`, w - priceW) + padLeft(`Rp${p.amount}`, priceW));
  }
  if (data.change > 0) {
    lines.push(padRight("Kembalian:", w - priceW) + padLeft(`Rp${data.change}`, priceW));
  }
  lines.push("=".repeat(w));
  lines.push(padCenter("Terima Kasih", w));
  lines.push(padCenter("Barang yang sudah dibeli", w));
  lines.push(padCenter("tidak dapat dikembalikan", w));

  return lines.join("\n");
}
