import { useEffect, useRef, useCallback } from "react";

interface BarcodeResult {
  barcode: string;
}

export function useBarcodeScanner(
  onScan: (result: BarcodeResult) => void,
  options?: { timeout?: number }
) {
  const buffer = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCharTime = useRef(0);
  const manualMode = useRef(false);
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTimeout = useCallback(() => {
    if (options?.timeout) return options.timeout;
    try {
      const stored = localStorage.getItem("posgrosir_scan_timeout");
      if (stored) return parseInt(stored, 10);
    } catch {}
    return 100;
  }, [options?.timeout]);

  const resetBuffer = useCallback(() => {
    buffer.current = "";
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const scanned = buffer.current.trim();
        if (scanned.length > 0 && scanned.length <= 50) {
          onScan({ barcode: scanned });
        }
        resetBuffer();
        return;
      }

      if (e.key.length === 1) {
        const now = Date.now();
        const timeout = getTimeout();

        if (lastCharTime.current > 0 && now - lastCharTime.current > timeout * 3) {
          manualMode.current = true;
          if (manualTimer.current) clearTimeout(manualTimer.current);
          manualTimer.current = setTimeout(() => {
            manualMode.current = false;
          }, 2000);
        }

        if (manualMode.current) return;

        if (timer.current) clearTimeout(timer.current);

        if (buffer.current.length >= 50) {
          resetBuffer();
          return;
        }

        buffer.current += e.key;
        lastCharTime.current = now;

        timer.current = setTimeout(() => {
          resetBuffer();
        }, timeout);
      }
    },
    [onScan, getTimeout, resetBuffer]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timer.current) clearTimeout(timer.current);
      if (manualTimer.current) clearTimeout(manualTimer.current);
    };
  }, [handleKeyDown]);
}
