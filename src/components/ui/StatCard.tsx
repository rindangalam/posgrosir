import type { Icon } from "@phosphor-icons/react";

interface Props {
  icon: Icon;
  label: string;
  value: string;
  color: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error";
  trend?: { value: string; up: boolean };
}

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

const iconBgMap: Record<string, string> = {
  primary: "bg-primary/20",
  secondary: "bg-secondary/20",
  accent: "bg-accent/20",
  info: "bg-info/20",
  success: "bg-success/20",
  warning: "bg-warning/20",
  error: "bg-error/20",
};

export default function StatCard({ icon: Icon, label, value, color, trend }: Props) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-box p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${iconBgMap[color]} flex items-center justify-center shrink-0`}>
        <Icon size={24} className={`${colorMap[color].split(" ")[1]}`} weight="fill" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-base-content/60 truncate">{label}</p>
        <p className="text-xl font-heading font-bold">{value}</p>
        {trend && (
          <p className={`text-xs flex items-center gap-1 ${trend.up ? "text-success" : "text-error"}`}>
            <span>{trend.up ? "↑" : "↓"}</span>
            <span>{trend.value}</span>
          </p>
        )}
      </div>
    </div>
  );
}
