use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PaymentInfo {
    pub id: i64,
    pub transaction_id: i64,
    pub method: String,
    pub amount: i64,
    pub reference: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TransactionResult {
    pub id: i64,
    pub transaction_number: String,
    pub subtotal: i64,
    pub discount_total: i64,
    pub grand_total: i64,
    pub payment_status: String,
    pub payments: Vec<PaymentInfo>,
    pub amount_paid: i64,
    pub change: i64,
    pub created_at: String,
}
