import { Outlet } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

export default function RootLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen">
      <Sidebar />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={() => useUIStore.getState().toggleSidebar()}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-base-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
