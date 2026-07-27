import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";

export interface ScalePort {
  port_name: string;
  description: string;
}

export interface ScaleReading {
  grams: number;
  stable: boolean;
  raw: string;
}

function getScaleSettings() {
  try {
    const raw = localStorage.getItem("posgrosir_scale_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { portName: "", timeoutMs: 3000 };
}

export function useScale() {
  const listPorts = useCallback(async (): Promise<ScalePort[]> => {
    try {
      return await invoke<ScalePort[]>("list_serial_ports");
    } catch {
      return [];
    }
  }, []);

  const readScale = useCallback(async (): Promise<ScaleReading | null> => {
    const settings = getScaleSettings();
    if (!settings.portName) return null;
    try {
      return await invoke<ScaleReading>("read_scale", {
        portName: settings.portName,
        timeoutMs: settings.timeoutMs,
      });
    } catch {
      return null;
    }
  }, []);

  const testScale = useCallback(async (portName: string, timeoutMs: number): Promise<string | null> => {
    try {
      const result = await invoke<ScaleReading>("read_scale", { portName, timeoutMs });
      return result ? `${result.grams} gram (${result.raw})` : null;
    } catch (err) {
      return String(err);
    }
  }, []);

  return { listPorts, readScale, testScale, getScaleSettings };
}
