import { useUIStore } from "@/stores/uiStore";
import { Moon, Sun } from "@phosphor-icons/react";

export default function TopNav() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);

  return (
    <header className="h-14 bg-base-100 border-b border-base-300 flex items-center px-4 gap-2">
      <button
        onClick={toggleSidebar}
        className="btn btn-ghost btn-sm btn-square"
        title="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div className="flex-1" />
      <button
        onClick={toggleDarkMode}
        className="btn btn-ghost btn-sm btn-square"
        title={darkMode ? "Mode Terang" : "Mode Gelap"}
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <span className="text-sm text-base-content/60 hidden sm:block">
        {new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </span>
    </header>
  );
}
