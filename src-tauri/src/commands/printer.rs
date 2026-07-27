use crate::printer::{self, ReceiptItem, ReceiptPayment};

#[tauri::command]
pub fn list_printers() -> Result<Vec<printer::PrinterInfo>, String> {
    printer::list_printers()
}

#[tauri::command]
pub fn print_receipt(
    printer_name: String,
    store_name: String,
    store_address: String,
    transaction_number: String,
    date: String,
    items: Vec<ReceiptItem>,
    payments: Vec<ReceiptPayment>,
    subtotal: i64,
    discount_total: i64,
    grand_total: i64,
    change: i64,
    paper_width: u8,
    open_drawer: bool,
) -> Result<(), String> {
    printer::print_receipt(
        &printer_name,
        &store_name,
        &store_address,
        &transaction_number,
        &date,
        &items,
        &payments,
        subtotal,
        discount_total,
        grand_total,
        change,
        paper_width,
        open_drawer,
    )
}

#[tauri::command]
pub fn test_print(printer_name: String) -> Result<(), String> {
    printer::test_print(&printer_name)
}
