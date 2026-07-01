"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Changelog } from "@/domain/entities/changelog";
import { createClient } from "@/lib/supabase/client";

type ChangelogPanelProps = {
  initialChangelogs: Changelog[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChangelogPanel({ initialChangelogs }: ChangelogPanelProps) {
  const router = useRouter();
  const [changelogs, setChangelogs] = useState(initialChangelogs);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function handlePublish(changelogId: string) {
    setError(null);
    setPublishingId(changelogId);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("changelogs")
      .update({ published_at: new Date().toISOString() })
      .eq("id", changelogId);

    setPublishingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setChangelogs((current) =>
      current.map((entry) =>
        entry.id === changelogId
          ? { ...entry, published_at: new Date().toISOString() }
          : entry
      )
    );
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-base font-semibold tracking-tight">
          Changelog queue
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Publish draft updates when a shipped change is ready for customers.
        </p>
      </div>

      <div className="p-5">
        {error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {changelogs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              No changelog entries yet.
            </p>
            <p className="mt-1 leading-6 text-zinc-500">
              Draft release notes will appear here before they are published to
              the public changelog.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {changelogs.map((entry) => {
              const isDraft = entry.published_at === null;

              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-zinc-950 dark:text-zinc-50">
                          {entry.title}
                        </h3>
                        {entry.version ? (
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                            v{entry.version}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            isDraft
                              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                          }`}
                        >
                          {isDraft ? "Draft" : "Published"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {entry.published_at
                          ? `Published ${formatDate(entry.published_at)}`
                          : `Drafted ${formatDate(entry.created_at)}`}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {entry.body}
                      </p>
                    </div>
                    {isDraft ? (
                      <button
                        type="button"
                        disabled={publishingId === entry.id}
                        onClick={() => handlePublish(entry.id)}
                        className="w-fit rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        {publishingId === entry.id ? "Publishing..." : "Publish"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
