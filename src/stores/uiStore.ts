import { create } from "zustand";

export interface UserInfo {
  id: number;
  username: string;
  role: string;
  display_name: string;
}

interface UIState {
  sidebarOpen: boolean;
  currentRoute: string;
  darkMode: boolean;
  currentUser: UserInfo | null;
  printerName: string;
  paperWidth: number;
  autoPrint: boolean;
  openDrawer: boolean;
  scalePortName: string;
  scaleTimeoutMs: number;
  taxRate: number;
  soundEnabled: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCurrentRoute: (route: string) => void;
  toggleDarkMode: () => void;
  setCurrentUser: (user: UserInfo | null) => void;
  logout: () => void;
  setPrinterName: (name: string) => void;
  setPaperWidth: (width: number) => void;
  setAutoPrint: (on: boolean) => void;
  setOpenDrawer: (on: boolean) => void;
  setScalePortName: (name: string) => void;
  setScaleTimeoutMs: (ms: number) => void;
  setTaxRate: (rate: number) => void;
  setSoundEnabled: (on: boolean) => void;
  loadSettings: () => void;
  savePrinterSettings: () => void;
  saveScaleSettings: () => void;
  saveTaxSettings: () => void;
  saveSoundSettings: () => void;
}

function loadPrinterSettings() {
  try {
    const raw = localStorage.getItem("posgrosir_printer_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { printerName: "", paperWidth: 48, autoPrint: true, openDrawer: true };
}

function loadScaleSettings() {
  try {
    const raw = localStorage.getItem("posgrosir_scale_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        scalePortName: parsed.scalePortName ?? parsed.portName ?? "",
        scaleTimeoutMs: parsed.scaleTimeoutMs ?? parsed.timeoutMs ?? 3000,
      };
    }
  } catch {}
  return { scalePortName: "", scaleTimeoutMs: 3000 };
}

function loadDarkMode(): boolean {
  try { return localStorage.getItem("posgrosir_dark_mode") === "true"; } catch { return false; }
}

function loadTaxRate(): number {
  try { return Number(localStorage.getItem("posgrosir_tax_rate")) || 0; } catch { return 0; }
}

function loadSoundEnabled(): boolean {
  try { return localStorage.getItem("posgrosir_sound_enabled") !== "false"; } catch { return true; }
}

function loadCurrentUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem("posgrosir_current_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  currentRoute: "/dashboard",
  darkMode: loadDarkMode(),
  currentUser: loadCurrentUser(),
  ...loadPrinterSettings(),
  ...loadScaleSettings(),
  taxRate: loadTaxRate(),
  soundEnabled: loadSoundEnabled(),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCurrentRoute: (route) => set({ currentRoute: route }),
  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    localStorage.setItem("posgrosir_dark_mode", String(next));
  },
  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      localStorage.setItem("posgrosir_current_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("posgrosir_current_user");
    }
  },
  logout: () => {
    set({ currentUser: null });
    localStorage.removeItem("posgrosir_current_user");
  },

  setPrinterName: (name) => {
    set({ printerName: name });
    get().savePrinterSettings();
  },
  setPaperWidth: (width) => {
    set({ paperWidth: width });
    get().savePrinterSettings();
  },
  setAutoPrint: (on) => {
    set({ autoPrint: on });
    get().savePrinterSettings();
  },
  setOpenDrawer: (on) => {
    set({ openDrawer: on });
    get().savePrinterSettings();
  },

  setScalePortName: (name) => {
    set({ scalePortName: name });
    get().saveScaleSettings();
  },
  setScaleTimeoutMs: (ms) => {
    set({ scaleTimeoutMs: ms });
    get().saveScaleSettings();
  },

  setTaxRate: (rate) => {
    set({ taxRate: rate });
    get().saveTaxSettings();
  },

  setSoundEnabled: (on) => {
    set({ soundEnabled: on });
    get().saveSoundSettings();
  },

  loadSettings: () => {
    const ps = loadPrinterSettings();
    const ss = loadScaleSettings();
    set({
      printerName: ps.printerName,
      paperWidth: ps.paperWidth,
      autoPrint: ps.autoPrint,
      openDrawer: ps.openDrawer,
      scalePortName: ss.scalePortName,
      scaleTimeoutMs: ss.scaleTimeoutMs,
      taxRate: loadTaxRate(),
      soundEnabled: loadSoundEnabled(),
    });
  },

  savePrinterSettings: () => {
    const { printerName, paperWidth, autoPrint, openDrawer } = get();
    localStorage.setItem("posgrosir_printer_settings", JSON.stringify({ printerName, paperWidth, autoPrint, openDrawer }));
  },

  saveScaleSettings: () => {
    const { scalePortName, scaleTimeoutMs } = get();
    localStorage.setItem("posgrosir_scale_settings", JSON.stringify({ scalePortName, scaleTimeoutMs }));
  },

  saveTaxSettings: () => {
    const { taxRate } = get();
    localStorage.setItem("posgrosir_tax_rate", String(taxRate));
  },

  saveSoundSettings: () => {
    const { soundEnabled } = get();
    localStorage.setItem("posgrosir_sound_enabled", String(soundEnabled));
  },
}));
