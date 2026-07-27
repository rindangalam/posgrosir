use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StockBatch {
    pub id: i64,
    pub product_id: i64,
    pub quantity: i64,
    pub purchase_price: i64,
    pub expiry_date: Option<String>,
    pub received_date: String,
    pub batch_code: String,
    pub supplier: String,
    pub is_deleted: bool,
    pub created_at: String,
    pub updated_at: String,
}
