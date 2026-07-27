use serde::Serialize;
use std::time::Duration;

#[derive(Serialize)]
pub struct ScalePort {
    pub port_name: String,
    pub description: String,
}

#[derive(Serialize)]
pub struct ScaleReading {
    pub grams: f64,
    pub stable: bool,
    pub raw: String,
}

pub fn list_serial_ports() -> Result<Vec<ScalePort>, String> {
    let ports = serialport::available_ports().map_err(|e| format!("Gagal scan port: {}", e))?;
    let result: Vec<ScalePort> = ports
        .into_iter()
        .map(|p| ScalePort {
            port_name: p.port_name.clone(),
            description: match &p.port_type {
                serialport::SerialPortType::UsbPort(info) => format!(
                    "{} ({:04x}:{:04x})",
                    info.product.as_deref().unwrap_or("USB Device"),
                    info.vid,
                    info.pid
                ),
                serialport::SerialPortType::BluetoothPort => "Bluetooth".to_string(),
                _ => "Serial Port".to_string(),
            },
        })
        .collect();
    Ok(result)
}

pub fn read_scale(port_name: &str, timeout_ms: u64) -> Result<ScaleReading, String> {
    let mut port = serialport::new(port_name, 9600)
        .timeout(Duration::from_millis(timeout_ms))
        .data_bits(serialport::DataBits::Eight)
        .flow_control(serialport::FlowControl::None)
        .parity(serialport::Parity::None)
        .stop_bits(serialport::StopBits::One)
        .open()
        .map_err(|e| format!("Gagal buka port {}: {}", port_name, e))?;

    let mut buf = vec![0u8; 64];
    let mut raw_data = String::new();

    let start = std::time::Instant::now();
    while start.elapsed() < Duration::from_millis(timeout_ms) {
        match port.read(buf.as_mut_slice()) {
            Ok(n) if n > 0 => {
                let s = String::from_utf8_lossy(&buf[..n]);
                raw_data.push_str(&s);
                if let Some(reading) = parse_weight(&raw_data) {
                    return Ok(ScaleReading {
                        grams: reading,
                        stable: true,
                        raw: raw_data.trim().to_string(),
                    });
                }
            }
            Ok(_) => continue,
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
            Err(e) => return Err(format!("Error baca port: {}", e)),
        }
    }

    if !raw_data.trim().is_empty() {
        if let Some(grams) = parse_weight(&raw_data) {
            return Ok(ScaleReading {
                grams,
                stable: true,
                raw: raw_data.trim().to_string(),
            });
        }
        return Err(format!("Data tidak dikenal: {}", raw_data.trim()));
    }

    Err("Tidak ada data dari timbangan (timeout)".to_string())
}

fn parse_weight(data: &str) -> Option<f64> {
    for line in data.lines() {
        let trimmed = line.trim();
        // Pattern: +/\d+.\d{2,3} followed by kg/g/lb
        // Common formats:
        //   ST,GS,+001.500kg   (CAS scale)
        //   ST,NT,+000.300kg   (CAS scale not stable)
        //   +001.250kg         (generic)
        //   1.250 kg           (simple)
        //   WT:+001.200kg      (Dibal/AD-10)
        if let Some(val) = extract_weight_numeric(trimmed) {
            if trimmed.contains("lb") || trimmed.contains("LB") {
                return Some(val * 453.592);
            }
            if trimmed.contains("g") && !trimmed.contains("kg") {
                return Some(val);
            }
            return Some(val * 1000.0);
        }
        // Plain number that could be kg
        if let Ok(val) = trimmed.parse::<f64>() {
            if val > 0.0 && val < 500.0 {
                return Some(val * 1000.0);
            }
            if val >= 500.0 {
                return Some(val);
            }
        }
    }
    None
}

fn extract_weight_numeric(s: &str) -> Option<f64> {
    let bytes = s.as_bytes();
    let mut start = None;
    for i in 0..bytes.len() {
        let c = bytes[i] as char;
        if c.is_ascii_digit() || c == '+' || c == '-' {
            if start.is_none() {
                start = Some(i);
            }
        } else if c == '.' {
            // continue, part of decimal
        } else if let Some(si) = start {
            let candidate = &s[si..i];
            if candidate.contains('.') {
                if let Ok(val) = candidate.parse::<f64>() {
                    return Some(val);
                }
            }
            start = None;
        }
    }
    // Check last segment
    if let Some(si) = start {
        let candidate = &s[si..];
        if candidate.contains('.') {
            if let Ok(val) = candidate.parse::<f64>() {
                return Some(val);
            }
        }
    }
    None
}
