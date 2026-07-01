import { StatusBadge } from "@/components/public/status-badge";
import { SectionHeader } from "@/components/public/section-header";
import type { RoadmapItem } from "@/domain/entities/roadmap-item";

const ROADMAP_COLUMNS: Array<{
  status: RoadmapItem["status"];
  label: string;
}> = [
  { status: "planned", label: "Planned" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

function formatTargetDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
          {item.title}
        </h3>
        <StatusBadge status={item.status} />
      </div>
      {item.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {item.description}
        </p>
      ) : null}
      {item.target_date ? (
        <p className="mt-2.5 text-[11px] font-medium text-zinc-500">
          Target {formatTargetDate(item.target_date)}
        </p>
      ) : null}
    </article>
  );
}

type RoadmapSectionProps = {
  items: RoadmapItem[];
};

export function RoadmapSection({ items }: RoadmapSectionProps) {
  const activeColumns = ROADMAP_COLUMNS.filter((column) =>
    items.some((item) => item.status === column.status)
  );
  const otherItems = items.filter(
    (item) => !ROADMAP_COLUMNS.some((column) => column.status === item.status)
  );

  return (
    <section className="flex flex-col gap-5">
      <SectionHeader
        title="Roadmap"
        description="What we're building next — grouped by status so you can scan at a glance."
      />

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">No roadmap items yet.</p>
      ) : (
        <>
          <div
            className={`grid gap-4 ${
              activeColumns.length >= 3
                ? "sm:grid-cols-3"
                : activeColumns.length === 2
                  ? "sm:grid-cols-2"
                  : "grid-cols-1"
            }`}
          >
            {activeColumns.map((column) => {
              const columnItems = items.filter(
                (item) => item.status === column.status
              );

              return (
                <div key={column.status} className="flex flex-col gap-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {column.label}
                    <span className="ml-1.5 font-normal text-zinc-400">
                      ({columnItems.length})
                    </span>
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {columnItems.map((item) => (
                      <li key={item.id}>
                        <RoadmapCard item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {otherItems.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Other
              </h3>
              <ul className="flex flex-col gap-2.5">
                {otherItems.map((item) => (
                  <li key={item.id}>
                    <RoadmapCard item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
