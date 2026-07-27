use crate::scales;

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<scales::ScalePort>, String> {
    scales::list_serial_ports()
}

#[tauri::command]
pub fn read_scale(port_name: String, timeout_ms: u64) -> Result<scales::ScaleReading, String> {
    scales::read_scale(&port_name, timeout_ms)
}
