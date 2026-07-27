import type { Icon } from "@phosphor-icons/react";

interface Props {
  icon: Icon;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ icon: Icon, title, subtitle, children }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon size={22} className="text-primary" weight="fill" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
