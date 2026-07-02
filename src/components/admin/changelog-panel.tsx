"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Changelog } from "@/domain/entities/changelog";
import { createClient } from "@/lib/supabase/client";

type ChangelogPanelProps = {
  organizationId: string;
  initialChangelogs: Changelog[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Draft = {
  title: string;
  version: string;
  body: string;
};

function toDraft(entry?: Changelog): Draft {
  return {
    title: entry?.title ?? "",
    version: entry?.version ?? "",
    body: entry?.body ?? "",
  };
}

export function ChangelogPanel({
  organizationId,
  initialChangelogs,
}: ChangelogPanelProps) {
  const router = useRouter();
  const [changelogs, setChangelogs] = useState(initialChangelogs);
  const [newDraft, setNewDraft] = useState<Draft>(() => toDraft());
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initialChangelogs.map((entry) => [entry.id, toDraft(entry)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!newDraft.title.trim() || !newDraft.body.trim()) {
      setError("Changelog title and body are required.");
      return;
    }

    setCreating(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("changelogs")
      .insert({
        organization_id: organizationId,
        title: newDraft.title.trim(),
        version: newDraft.version.trim() || null,
        body: newDraft.body.trim(),
        published_at: null,
      })
      .select("id, organization_id, title, body, version, published_at, created_at, updated_at")
      .single();

    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      const entry = data as Changelog;
      setChangelogs((current) => [entry, ...current]);
      setDrafts((current) => ({ ...current, [entry.id]: toDraft(entry) }));
    }

    setNewDraft(toDraft());
    router.refresh();
  }

  async function handleSave(changelogId: string) {
    const draft = drafts[changelogId];
    if (!draft?.title.trim() || !draft.body.trim()) {
      setError("Changelog title and body are required.");
      return;
    }

    setError(null);
    setSavingId(changelogId);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("changelogs")
      .update({
        title: draft.title.trim(),
        version: draft.version.trim() || null,
        body: draft.body.trim(),
      })
      .eq("id", changelogId);

    setSavingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setChangelogs((current) =>
      current.map((entry) =>
        entry.id === changelogId
          ? {
              ...entry,
              title: draft.title.trim(),
              version: draft.version.trim() || null,
              body: draft.body.trim(),
            }
          : entry
      )
    );
    router.refresh();
  }

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

        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <p className="text-sm font-semibold">Draft release note</p>
          <ChangelogFields
            draft={newDraft}
            onChange={(patch) => setNewDraft((current) => ({ ...current, ...patch }))}
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-3 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {creating ? "Creating..." : "Create draft"}
          </button>
        </form>

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
                    <div className="min-w-0 flex-1">
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
                      <ChangelogFields
                        draft={drafts[entry.id] ?? toDraft(entry)}
                        onChange={(patch) =>
                          setDrafts((current) => ({
                            ...current,
                            [entry.id]: {
                              ...(current[entry.id] ?? toDraft(entry)),
                              ...patch,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                      <button
                        type="button"
                        disabled={savingId === entry.id}
                        onClick={() => handleSave(entry.id)}
                        className="w-fit rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                      >
                        {savingId === entry.id ? "Saving..." : "Save"}
                      </button>
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

function ChangelogFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <div className="mt-3 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Title
          <input
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="What shipped?"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Version
          <input
            value={draft.version}
            onChange={(event) => onChange({ version: event.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="0.4.0"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Body
        <textarea
          value={draft.body}
          rows={4}
          onChange={(event) => onChange({ body: event.target.value })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Write concise release notes in Markdown."
        />
      </label>
    </div>
  );
}
