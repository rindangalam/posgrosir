export interface ICategory {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface IProduct {
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
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface IUnitConversion {
  id: number;
  product_id: number;
  from_unit: string;
  to_unit: string;
  factor: number;
  is_default: number;
}

export interface IStockBatch {
  id: number;
  product_id: number;
  quantity: number;
  purchase_price: number;
  expiry_date: string;
  received_date: string;
  batch_code: string;
  supplier: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface ITransaction {
  id: number;
  transaction_number: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  payment_status: "completed" | "voided" | "refunded";
  notes: string;
  created_at: string;
}

export interface ITransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  stock_batch_id: number;
  quantity: number;
  unit: string;
  unit_conversion_factor: number;
  base_quantity: number;
  selling_price: number;
  discount: number;
  subtotal: number;
}

export interface IPayment {
  id: number;
  transaction_id: number;
  method: "cash" | "qris" | "edc";
  amount: number;
  reference: string;
  created_at: string;
}

export interface IPromotion {
  id: number;
  name: string;
  type: "percentage" | "nominal";
  value: number;
  scope: "product" | "category" | "all";
  scope_id: number | null;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
}

export interface IUser {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "cashier";
  display_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface IStockOpname {
  id: number;
  product_id: number;
  batch_id: number;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  notes: string;
  created_at: string;
}

export interface IDailySummary {
  id: number;
  date: string;
  total_transactions: number;
  gross_sales: number;
  total_discounts: number;
  net_sales: number;
  total_cash: number;
  total_qris: number;
  total_edc: number;
  created_at: string;
}

export interface ICartItem {
  product_id: number;
  name: string;
  barcode: string;
  plu_code: string;
  category_id: number | null;
  quantity: number;
  unit: string;
  unit_conversion_factor: number;
  base_quantity: number;
  selling_price: number;
  discount: number;
  subtotal: number;
  stock_batch_id: number | null;
  total_stock: number;
  stock_threshold: number;
  promo_name: string;
}

export interface IItemDiscount {
  product_id: number;
  discount: number;
  promo_name: string;
}

export interface IPaymentInfo {
  id: number;
  transaction_id: number;
  method: string;
  amount: number;
  reference: string;
  created_at: string;
}

export interface ITransactionResult {
  id: number;
  transaction_number: string;
  subtotal: number;
  discount_total: number;
  grand_total: number;
  payment_status: string;
  payments: IPaymentInfo[];
  amount_paid: number;
  change: number;
  created_at: string;
}
