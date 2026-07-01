type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  planned: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  in_progress: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  shipped: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  closed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  shipped: "Shipped",
  closed: "Closed",
  cancelled: "Cancelled",
};

function formatStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs"
      : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-medium capitalize ${sizeClass} ${style}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
