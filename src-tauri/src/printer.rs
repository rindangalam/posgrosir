use std::io::Write;
use std::process::Command;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub driver: String,
    pub port: String,
}

#[derive(Serialize)]
pub struct ReceiptLine {
    pub text: String,
    pub align: String,
    pub bold: bool,
    pub double: bool,
}

pub fn list_printers() -> Result<Vec<PrinterInfo>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json",
        ])
        .output()
        .map_err(|e| format!("Gagal menjalankan PowerShell: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();

    if trimmed.is_empty() || trimmed == "[]" || trimmed == "null" {
        return Ok(Vec::new());
    }

    if trimmed.starts_with('[') {
        serde_json::from_str::<Vec<PrinterInfo>>(trimmed)
            .map_err(|e| format!("Gagal parse JSON printer: {}", e))
    } else {
        serde_json::from_str::<PrinterInfo>(trimmed)
            .map(|p| vec![p])
            .map_err(|e| format!("Gagal parse JSON printer tunggal: {}", e))
    }
}

fn build_escpos_receipt(lines: &[ReceiptLine], col_width: u8) -> Vec<u8> {
    let mut bytes = Vec::new();

    bytes.extend_from_slice(&[0x1B, 0x40]);

    for line in lines {
        match line.align.as_str() {
            "center" => bytes.extend_from_slice(&[0x1B, 0x61, 0x01]),
            "right" => bytes.extend_from_slice(&[0x1B, 0x61, 0x02]),
            _ => bytes.extend_from_slice(&[0x1B, 0x61, 0x00]),
        }

        if line.bold {
            bytes.extend_from_slice(&[0x1B, 0x45, 0x01]);
        }

        if line.double {
            bytes.extend_from_slice(&[0x1D, 0x21, 0x11]);
        }

        let text = if line.text.len() > col_width as usize {
            let max = if line.double { col_width as usize / 2 } else { col_width as usize };
            let truncated: String = line.text.chars().take(max).collect();
            truncated
        } else {
            line.text.clone()
        };

        bytes.extend_from_slice(text.as_bytes());

        if line.double {
            bytes.extend_from_slice(&[0x1D, 0x21, 0x00]);
        }

        if line.bold {
            bytes.extend_from_slice(&[0x1B, 0x45, 0x00]);
        }

        bytes.push(0x0A);
    }

    bytes
}

fn add_cash_drawer_cmd(bytes: &mut Vec<u8>) {
    bytes.extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]);
}

fn add_paper_cut_cmd(bytes: &mut Vec<u8>) {
    bytes.extend_from_slice(&[0x1D, 0x56, 0x00]);
}

fn print_raw_to_printer(printer_name: &str, data: &[u8]) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("posgrosir_print.raw");

    {
        let mut file = std::fs::File::create(&temp_file)
            .map_err(|e| format!("Gagal buat file temp: {}", e))?;
        file.write_all(data)
            .map_err(|e| format!("Gagal tulis file temp: {}", e))?;
    }

    let ps_script = format!(
        "$data = [System.IO.File]::ReadAllBytes('{}'); \
         Write-Printer -PrinterName '{}' -Data $data",
        temp_file.to_string_lossy().replace('\'', "''"),
        printer_name.replace('\'', "''")
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("Gagal menjalankan PowerShell: {}", e))?;

    let _ = std::fs::remove_file(&temp_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Gagal mencetak: {}", stderr));
    }

    Ok(())
}

fn build_receipt_text(
    store_name: &str,
    store_address: &str,
    transaction_number: &str,
    date: &str,
    items: &[ReceiptItem],
    payments: &[ReceiptPayment],
    subtotal: i64,
    discount_total: i64,
    grand_total: i64,
    change: i64,
    col_width: u8,
) -> Vec<ReceiptLine> {
    let mut lines = Vec::new();

    lines.push(ReceiptLine { text: store_name.to_string(), align: "center".to_string(), bold: true, double: true });
    lines.push(ReceiptLine { text: store_address.to_string(), align: "center".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: "=".repeat(col_width as usize), align: "left".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: format!("No: {}", transaction_number), align: "left".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: format!("Tgl: {}", date), align: "left".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: "-".repeat(col_width as usize), align: "left".to_string(), bold: false, double: false });

    let name_w = col_width as usize - 14;
    let qty_w = 6;
    let price_w = 8;
    lines.push(ReceiptLine {
        text: format!("{:<width$}{:>qty$}{:>prc$}", "Nama", "Qty", "Harga", width = name_w, qty = qty_w, prc = price_w),
        align: "left".to_string(), bold: true, double: false,
    });
    lines.push(ReceiptLine { text: "-".repeat(col_width as usize), align: "left".to_string(), bold: false, double: false });

    for item in items {
        let qty_str = format!("{} {}", item.quantity, item.unit);
        let price_str = format_number_short(item.total);
        let name_trim = if item.name.len() > name_w { format!("{}..", &item.name[..name_w - 2]) } else { item.name.clone() };
        lines.push(ReceiptLine {
            text: format!("{:<width$}{:>qty$}{:>prc$}", name_trim, qty_str, price_str, width = name_w, qty = qty_w, prc = price_w),
            align: "left".to_string(), bold: false, double: false,
        });
        if item.discount > 0 {
            lines.push(ReceiptLine {
                text: format!("  Diskon:{:>width$}", format!("-{}", format_number_short(item.discount)), width = col_width as usize - 9),
                align: "left".to_string(), bold: false, double: false,
            });
        }
    }

    lines.push(ReceiptLine { text: "-".repeat(col_width as usize), align: "left".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: format!("{:.<width$}{:>prc$}", "Subtotal", format_number_short(subtotal), width = col_width as usize - 12, prc = 12), align: "left".to_string(), bold: false, double: false });

    if discount_total > 0 {
        lines.push(ReceiptLine { text: format!("{:.<width$}{:>prc$}", "Diskon", format_number_short(discount_total), width = col_width as usize - 12, prc = 12), align: "left".to_string(), bold: false, double: false });
    }

    lines.push(ReceiptLine { text: format!("{:.<width$}{:>prc$}", "Grand Total", format_number_short(grand_total), width = col_width as usize - 12, prc = 12), align: "left".to_string(), bold: true, double: false });
    lines.push(ReceiptLine { text: "=".repeat(col_width as usize), align: "left".to_string(), bold: false, double: false });

    lines.push(ReceiptLine { text: "Pembayaran:".to_string(), align: "left".to_string(), bold: true, double: false });
    for p in payments {
        lines.push(ReceiptLine {
            text: format!("  {}: {:>prc$}", p.method_label, format_number_short(p.amount), prc = col_width as usize - 6),
            align: "left".to_string(), bold: false, double: false,
        });
    }

    if change > 0 {
        lines.push(ReceiptLine { text: format!("Kembalian: {:>prc$}", format_number_short(change), prc = col_width as usize - 10), align: "left".to_string(), bold: false, double: false });
    }

    lines.push(ReceiptLine { text: "=".repeat(col_width as usize), align: "left".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: "Terima Kasih".to_string(), align: "center".to_string(), bold: true, double: true });
    lines.push(ReceiptLine { text: "Barang yang sudah dibeli".to_string(), align: "center".to_string(), bold: false, double: false });
    lines.push(ReceiptLine { text: "tidak dapat dikembalikan".to_string(), align: "center".to_string(), bold: false, double: false });

    lines
}

fn format_number_short(n: i64) -> String {
    if n >= 1_000_000 {
        format!("Rp{}jt", n / 1_000_000)
    } else if n >= 1_000 {
        format!("Rp{}rb", n / 1_000)
    } else {
        format!("Rp{}", n)
    }
}

#[derive(Serialize, serde::Deserialize)]
pub struct ReceiptPayment {
    pub method_label: String,
    pub amount: i64,
}

#[derive(Serialize, serde::Deserialize)]
pub struct ReceiptItem {
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub total: i64,
    pub discount: i64,
}

pub fn print_receipt(
    printer_name: &str,
    store_name: &str,
    store_address: &str,
    transaction_number: &str,
    date: &str,
    items: &[ReceiptItem],
    payments: &[ReceiptPayment],
    subtotal: i64,
    discount_total: i64,
    grand_total: i64,
    change: i64,
    paper_width: u8,
    open_drawer: bool,
) -> Result<(), String> {
    let col_width = match paper_width {
        58 => 32,
        _ => 48,
    };

    let receipt_lines = build_receipt_text(
        store_name, store_address,
        transaction_number, date,
        items, payments,
        subtotal, discount_total, grand_total, change,
        col_width,
    );

    let mut esc_data = build_escpos_receipt(&receipt_lines, col_width);

    if open_drawer {
        add_cash_drawer_cmd(&mut esc_data);
    }

    add_paper_cut_cmd(&mut esc_data);

    print_raw_to_printer(printer_name, &esc_data)
}

pub fn test_print(printer_name: &str) -> Result<(), String> {
    let lines = vec![
        ReceiptLine { text: "TEST PRINT".to_string(), align: "center".to_string(), bold: true, double: true },
        ReceiptLine { text: "POS Grosir".to_string(), align: "center".to_string(), bold: false, double: false },
        ReceiptLine { text: "=".repeat(48), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "Printer berfungsi normal.".to_string(), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "Tgl: ...".to_string(), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "-".repeat(48), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "Item 1           1x   Rp1.000".to_string(), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "Item 2           2x   Rp2.000".to_string(), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: " ".to_string(), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "Total: Rp3.000".to_string(), align: "right".to_string(), bold: true, double: false },
        ReceiptLine { text: "=".repeat(48), align: "left".to_string(), bold: false, double: false },
        ReceiptLine { text: "Terima Kasih".to_string(), align: "center".to_string(), bold: false, double: false },
    ];

    let mut esc_data = build_escpos_receipt(&lines, 48);
    add_cash_drawer_cmd(&mut esc_data);
    add_paper_cut_cmd(&mut esc_data);

    print_raw_to_printer(printer_name, &esc_data)
}
