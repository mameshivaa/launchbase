import { SectionHeader } from "@/components/public/section-header";
import type { Changelog } from "@/domain/entities/changelog";

function formatPublishedDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ChangelogBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="mt-2 flex flex-col gap-1.5 pl-1"
      >
        {listItems.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
          >
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h4
          key={`heading-${blocks.length}`}
          className="mt-4 first:mt-0 text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          {trimmed.slice(3)}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (trimmed === "") {
      flushList();
      continue;
    }

    flushList();
    blocks.push(
      <p
        key={`para-${blocks.length}`}
        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
      >
        {trimmed}
      </p>
    );
  }

  flushList();

  return <div className="mt-3">{blocks}</div>;
}

function ChangelogEntry({ entry }: { entry: Changelog }) {
  return (
    <article className="relative pl-6 sm:pl-8">
      <div className="absolute left-0 top-1.5 h-full w-px bg-zinc-200 dark:bg-zinc-800" />
      <div className="absolute left-0 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-500 ring-4 ring-white dark:border-zinc-950 dark:ring-zinc-950" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {entry.version ? (
          <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            v{entry.version}
          </span>
        ) : null}
        {entry.published_at ? (
          <time
            dateTime={entry.published_at}
            className="text-xs text-zinc-500"
          >
            {formatPublishedDate(entry.published_at)}
          </time>
        ) : null}
      </div>

      <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {entry.title}
      </h3>

      <ChangelogBody body={entry.body} />
    </article>
  );
}

type ChangelogSectionProps = {
  entries: Changelog[];
};

export function ChangelogSection({ entries }: ChangelogSectionProps) {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader
        title="Changelog"
        description="Recent product updates shipped to LaunchBase."
      />

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No published updates yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {entries.map((entry) => (
            <ChangelogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
