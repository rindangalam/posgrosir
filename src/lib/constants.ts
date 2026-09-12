export const DEFAULT_STORE_PROFILE = {
  name: "TOKO GROSIR MAKMUR",
  address: "Jl. Raya No. 123",
  phone: "",
};

export function loadStoreProfile() {
  try {
    const raw = localStorage.getItem("posgrosir_store_profile");
    if (raw) return { ...DEFAULT_STORE_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STORE_PROFILE;
}
