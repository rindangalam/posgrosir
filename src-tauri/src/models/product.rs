use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub plu_code: String,
    pub barcode: Option<String>,
    pub name: String,
    pub description: String,
    pub category_id: Option<i64>,
    pub base_unit: String,
    pub purchase_price: i64,
    pub selling_price: i64,
    pub stock_threshold: i64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ProductWithStock {
    pub product: Product,
    pub total_stock: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UnitConversion {
    pub id: i64,
    pub product_id: i64,
    pub from_unit: String,
    pub to_unit: String,
    pub factor: f64,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub parent_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}
