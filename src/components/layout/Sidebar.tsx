import { NavLink } from "react-router-dom";
import {
  ChartPieSlice,
  Receipt,
  Package,
  Archive,
  SquaresFour,
  Tag,
  ChartBar,
  GearSix,
  X,
} from "@phosphor-icons/react";
import { useUIStore } from "@/stores/uiStore";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: ChartPieSlice },
  { label: "Kasir", path: "/cashier", icon: Receipt },
  { label: "Produk", path: "/products", icon: Package },
  { label: "Kategori", path: "/categories", icon: SquaresFour },
  { label: "Stok", path: "/stocks", icon: Archive },
  { label: "Promo", path: "/promotions", icon: Tag },
  { label: "Laporan", path: "/reports/daily", icon: ChartBar },
  { label: "Pengaturan", path: "/settings", icon: GearSix },
];

export default function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-20
        bg-base-200 border-r border-base-300 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        lg:w-60
      `}
    >
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-primary">POS Grosir</h1>
        <button className="btn btn-ghost btn-sm btn-square lg:hidden" onClick={toggleSidebar}>
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 min-w-48">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} end onClick={() => {
              if (window.innerWidth < 1024) toggleSidebar();
            }}>
              {({ isActive }) => (
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-content font-semibold"
                      : "hover:bg-base-300"
                  }`}
                >
                  <Icon size={20} weight={isActive ? "fill" : "regular"} />
                  <span>{item.label}</span>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
