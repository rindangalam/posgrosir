import type { Icon } from "@phosphor-icons/react";

interface Props {
  icon: Icon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-base-300 flex items-center justify-center mb-4">
        <Icon size={32} className="text-base-content/40" weight="light" />
      </div>
      <h3 className="font-heading font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-base-content/60 max-w-xs">{description}</p>
      {action && (
        <button className="btn btn-primary mt-4" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
