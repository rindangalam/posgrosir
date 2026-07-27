import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { GearSix, Storefront } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";
import { usePrinter, type PrinterInfo } from "@/hooks/usePrinter";
import { useScale, type ScalePort } from "@/hooks/useScale";
import { useUIStore } from "@/stores/uiStore";

function loadStoreProfile() {
  try {
    const raw = localStorage.getItem("posgrosir_store_profile");
    return raw ? JSON.parse(raw) : { name: "TOKO GROSIR MAKMUR", address: "Jl. Raya No. 123", phone: "" };
  } catch { return { name: "TOKO GROSIR MAKMUR", address: "Jl. Raya No. 123", phone: "" }; }
}

export default function Settings() {
  const { listPrinters, testPrint } = usePrinter();
  const { listPorts, testScale } = useScale();
  const {
    printerName, paperWidth, autoPrint, openDrawer,
    setPrinterName, setPaperWidth, setAutoPrint, setOpenDrawer,
    scalePortName, scaleTimeoutMs,
    setScalePortName, setScaleTimeoutMs,
  } = useUIStore();

  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [scanTimeout, setScanTimeout] = useState(100);

  const [ports, setPorts] = useState<ScalePort[]>([]);
  const [portLoading, setPortLoading] = useState(false);
  const [scaleTestStatus, setScaleTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const p = loadStoreProfile();
    setStoreName(p.name);
    setStoreAddress(p.address);
    setStorePhone(p.phone || "");
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("posgrosir_store_profile", JSON.stringify({
      name: storeName.trim() || "TOKO GROSIR MAKMUR",
      address: storeAddress.trim() || "Jl. Raya No. 123",
      phone: storePhone.trim(),
    }));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
    toast.success("Profil toko disimpan");
  };

  useEffect(() => {
    (async () => {
      setPrintLoading(true);
      setPrinters(await listPrinters());
      setPrintLoading(false);
    })();
    (async () => {
      setPortLoading(true);
      setPorts(await listPorts());
      setPortLoading(false);
    })();
  }, [listPrinters, listPorts]);

  const handleTestPrint = async () => {
    if (!printerName) return;
    setTestStatus(null);
    const err = await testPrint(printerName);
    setTestStatus(err ? { ok: false, msg: err } : { ok: true, msg: "Test print berhasil dikirim" });
  };

  const handleRefreshPrinters = async () => {
    setPrintLoading(true);
    setPrinters(await listPrinters());
    setPrintLoading(false);
  };

  const handleRefreshPorts = async () => {
    setPortLoading(true);
    setPorts(await listPorts());
    setPortLoading(false);
  };

  const handleTestScale = async () => {
    if (!scalePortName) return;
    setScaleTestStatus(null);
    const result = await testScale(scalePortName, scaleTimeoutMs);
    if (result === null) {
      setScaleTestStatus({ ok: true, msg: "Timbangan membaca 0 gram" });
    } else if (result.includes("Error") || result.includes("Gagal") || result.includes("gagal")) {
      setScaleTestStatus({ ok: false, msg: result });
    } else {
      setScaleTestStatus({ ok: true, msg: `Berhasil: ${result}` });
    }
  };

  const handleScanTimeoutChange = (val: number) => {
    setScanTimeout(val);
    localStorage.setItem("posgrosir_scan_timeout", String(val));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader icon={GearSix} title="Pengaturan" subtitle="Profil toko, printer, timbangan, dan scanner" />

      {/* Store Profile */}
      <div className="bg-base-200 rounded-box p-4 space-y-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Storefront size={20} className="text-primary" weight="fill" />
          Profil Toko
        </h2>
        <p className="text-sm text-base-content/60">Informasi toko yang muncul di struk cetakan.</p>
        <div className="form-control">
          <label className="label"><span className="label-text">Nama Toko</span></label>
          <input type="text" className="input input-bordered" value={storeName}
            onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Alamat</span></label>
          <input type="text" className="input input-bordered" value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Telepon (opsional)</span></label>
          <input type="text" className="input input-bordered" value={storePhone}
            onChange={(e) => setStorePhone(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleSaveProfile}>
          {profileSaved ? "Tersimpan ✓" : "Simpan Profil"}
        </button>
      </div>

      {/* Printer Settings */}
      <div className="bg-base-200 rounded-box p-4 space-y-4">
        <h2 className="font-bold text-lg">Printer Thermal</h2>

        <div className="form-control">
          <label className="label"><span className="label-text">Pilih Printer</span></label>
          <div className="flex gap-2">
            <select className="select select-bordered flex-1" value={printerName} onChange={(e) => setPrinterName(e.target.value)}>
              <option value="">-- Pilih Printer --</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>{p.name} ({p.port})</option>
              ))}
            </select>
            <button className="btn btn-outline btn-square" onClick={handleRefreshPrinters} disabled={printLoading}>
              {printLoading ? <span className="loading loading-spinner" /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          {printers.length === 0 && !printLoading && (
            <p className="text-xs text-base-content/60 mt-1">Tidak ada printer terdeteksi.</p>
          )}
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Lebar Kertas</span></label>
          <select className="select select-bordered" value={paperWidth} onChange={(e) => setPaperWidth(Number(e.target.value))}>
            <option value={58}>58 mm (32 kolom)</option>
            <option value={80}>80 mm (48 kolom)</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Cetak otomatis setelah transaksi</span>
            <input type="checkbox" className="toggle toggle-primary" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Buka cash drawer otomatis</span>
            <input type="checkbox" className="toggle toggle-primary" checked={openDrawer} onChange={(e) => setOpenDrawer(e.target.checked)} />
          </label>
        </div>

        <button className="btn btn-primary" disabled={!printerName} onClick={handleTestPrint}>Test Print</button>
        {testStatus && <div className={`alert ${testStatus.ok ? "alert-success" : "alert-error"} text-sm`}><span>{testStatus.msg}</span></div>}
      </div>

      {/* Scale Settings */}
      <div className="bg-base-200 rounded-box p-4 space-y-4">
        <h2 className="font-bold text-lg">Timbangan Digital</h2>
        <p className="text-sm text-base-content/60">Opsional: untuk menimbang produk (gram).</p>

        <div className="form-control">
          <label className="label"><span className="label-text">Port Serial</span></label>
          <div className="flex gap-2">
            <select className="select select-bordered flex-1" value={scalePortName} onChange={(e) => setScalePortName(e.target.value)}>
              <option value="">-- Pilih Port --</option>
              {ports.map((p) => (
                <option key={p.port_name} value={p.port_name}>{p.port_name} — {p.description}</option>
              ))}
            </select>
            <button className="btn btn-outline btn-square" onClick={handleRefreshPorts} disabled={portLoading}>
              {portLoading ? <span className="loading loading-spinner" /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          {ports.length === 0 && !portLoading && (
            <p className="text-xs text-base-content/60 mt-1">Tidak ada port serial terdeteksi.</p>
          )}
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Timeout (ms)</span></label>
          <input type="number" className="input input-bordered w-32" min={500} max={15000} value={scaleTimeoutMs} onChange={(e) => setScaleTimeoutMs(Number(e.target.value))} />
        </div>

        <button className="btn btn-primary" disabled={!scalePortName} onClick={handleTestScale}>Test Timbangan</button>
        {scaleTestStatus && <div className={`alert ${scaleTestStatus.ok ? "alert-success" : "alert-error"} text-sm`}><span>{scaleTestStatus.msg}</span></div>}
      </div>

      {/* Scanner Settings */}
      <div className="bg-base-200 rounded-box p-4 space-y-4">
        <h2 className="font-bold text-lg">Barcode Scanner</h2>
        <div className="form-control">
          <label className="label"><span className="label-text">Timeout (ms)</span></label>
          <input type="number" className="input input-bordered w-32" min={30} max={500} value={scanTimeout} onChange={(e) => handleScanTimeoutChange(Number(e.target.value))} />
          <label className="label"><span className="label-text-alt text-base-content/60">Waktu tunggu antar karakter (50-100ms default)</span></label>
        </div>
      </div>

      {/* Print Queue */}
      <PrintQueueSection />
    </div>
  );
}

function PrintQueueSection() {
  const [queue, setQueue] = useState<any[]>([]);
  const { printReceipt } = usePrinter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("posgrosir_print_queue");
      setQueue(raw ? JSON.parse(raw) : []);
    } catch { setQueue([]); }
  }, []);

  const handleRetryAll = async () => {
    for (const item of queue) {
      const err = await printReceipt(item.storeName, item.storeAddress, item.transactionNumber, item.date,
        item.items, item.payments, item.subtotal, item.discountTotal, item.grandTotal, item.change);
      if (!err) {
        const remaining = queue.filter((q) => q.queuedAt !== item.queuedAt);
        localStorage.setItem("posgrosir_print_queue", JSON.stringify(remaining));
        setQueue(remaining);
      }
    }
  };

  const handleClear = () => {
    localStorage.removeItem("posgrosir_print_queue");
    setQueue([]);
  };

  if (queue.length === 0) return null;

  return (
    <div className="bg-base-200 rounded-box p-4 space-y-3">
      <h2 className="font-bold text-lg">Antrian Cetak {queue.length > 0 && <span className="badge badge-warning">{queue.length}</span>}</h2>
      <p className="text-sm text-base-content/60">Transaksi yang gagal cetak akan tersimpan di sini.</p>
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={handleRetryAll}>Cetak Ulang Semua</button>
        <button className="btn btn-ghost btn-sm" onClick={handleClear}>Hapus Antrian</button>
      </div>
    </div>
  );
}
