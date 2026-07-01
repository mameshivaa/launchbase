"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Changelog } from "@/domain/entities/changelog";
import { createClient } from "@/lib/supabase/client";

type ChangelogPanelProps = {
  initialChangelogs: Changelog[];
};

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
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Changelog</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Admins see drafts and published entries. Publishing sets{" "}
          <code className="text-xs">published_at</code> so the public page can
          show the release.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {changelogs.length === 0 ? (
        <p className="text-sm text-zinc-500">No changelog entries yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {changelogs.map((entry) => {
            const isDraft = entry.published_at === null;

            return (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{entry.title}</h3>
                  {entry.version ? (
                    <span className="text-xs text-zinc-500">v{entry.version}</span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isDraft
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                        : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                    }`}
                  >
                    {isDraft ? "Draft" : "Published"}
                  </span>
                </div>
                {entry.published_at ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Published {new Date(entry.published_at).toLocaleString()}
                  </p>
                ) : null}
                <pre className="mt-3 line-clamp-4 whitespace-pre-wrap font-sans text-sm text-zinc-600 dark:text-zinc-400">
                  {entry.body}
                </pre>
                {isDraft ? (
                  <button
                    type="button"
                    disabled={publishingId === entry.id}
                    onClick={() => handlePublish(entry.id)}
                    className="mt-3 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {publishingId === entry.id ? "Publishing…" : "Publish"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
