"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RoadmapItem } from "@/domain/entities/roadmap-item";
import { createClient } from "@/lib/supabase/client";

const ROADMAP_STATUSES = ["planned", "in_progress", "done", "cancelled"] as const;
type RoadmapStatus = RoadmapItem["status"];

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

type RoadmapPanelProps = {
  organizationId: string;
  initialItems: RoadmapItem[];
};

type Draft = {
  title: string;
  description: string;
  status: RoadmapStatus;
  sort_order: string;
  target_date: string;
};

function toDraft(item?: RoadmapItem): Draft {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    status: item?.status ?? "planned",
    sort_order: String(item?.sort_order ?? 0),
    target_date: item?.target_date ?? "",
  };
}

export function RoadmapPanel({ organizationId, initialItems }: RoadmapPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [newDraft, setNewDraft] = useState<Draft>(() => toDraft());
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initialItems.map((item) => [item.id, toDraft(item)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!newDraft.title.trim()) {
      setError("Roadmap title is required.");
      return;
    }

    setCreating(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("roadmap_items")
      .insert({
        organization_id: organizationId,
        title: newDraft.title.trim(),
        description: newDraft.description.trim() || null,
        status: newDraft.status,
        sort_order: Number(newDraft.sort_order) || 0,
        target_date: newDraft.target_date || null,
      })
      .select(
        "id, organization_id, title, description, status, sort_order, target_date, feature_request_id, created_at, updated_at"
      )
      .single();

    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      const item = data as RoadmapItem;
      setItems((current) =>
        [...current, item].sort((a, b) => a.sort_order - b.sort_order)
      );
      setDrafts((current) => ({ ...current, [item.id]: toDraft(item) }));
    }

    setNewDraft(toDraft());
    router.refresh();
  }

  async function saveItem(itemId: string) {
    const draft = drafts[itemId];
    if (!draft?.title.trim()) {
      setError("Roadmap title is required.");
      return;
    }

    setError(null);
    setBusyId(itemId);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("roadmap_items")
      .update({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        status: draft.status,
        sort_order: Number(draft.sort_order) || 0,
        target_date: draft.target_date || null,
      })
      .eq("id", itemId);

    setBusyId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((current) =>
      current
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                title: draft.title.trim(),
                description: draft.description.trim() || null,
                status: draft.status,
                sort_order: Number(draft.sort_order) || 0,
                target_date: draft.target_date || null,
              }
            : item
        )
        .sort((a, b) => a.sort_order - b.sort_order)
    );
    router.refresh();
  }

  async function deleteItem(itemId: string) {
    setError(null);
    setBusyId(itemId);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("roadmap_items")
      .delete()
      .eq("id", itemId);

    setBusyId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
    setDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    router.refresh();
  }

  function updateDraft(itemId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch },
    }));
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-base font-semibold tracking-tight">Roadmap editor</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Keep the public roadmap short, ordered, and current.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={createItem}
          className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <p className="text-sm font-semibold">Add roadmap item</p>
          <RoadmapFields
            draft={newDraft}
            onChange={(patch) => setNewDraft((current) => ({ ...current, ...patch }))}
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-3 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {creating ? "Adding..." : "Add item"}
          </button>
        </form>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              No roadmap items yet.
            </p>
            <p className="mt-1 leading-6 text-zinc-500">
              Add planned work after a feature request has enough signal.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <RoadmapFields
                  draft={drafts[item.id] ?? toDraft(item)}
                  onChange={(patch) => updateDraft(item.id, patch)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => saveItem(item.id)}
                    className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {busyId === item.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => deleteItem(item.id)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RoadmapFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_7rem]">
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Title
        <input
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Customer-facing milestone"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Status
        <select
          value={draft.status}
          onChange={(event) => onChange({ status: event.target.value as RoadmapStatus })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {ROADMAP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Order
        <input
          value={draft.sort_order}
          inputMode="numeric"
          onChange={(event) => onChange({ sort_order: event.target.value })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500 md:col-span-2">
        Description
        <textarea
          value={draft.description}
          rows={2}
          onChange={(event) => onChange({ description: event.target.value })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          placeholder="Why this matters to customers"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Target
        <input
          type="date"
          value={draft.target_date}
          onChange={(event) => onChange({ target_date: event.target.value })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
    </div>
  );
}
