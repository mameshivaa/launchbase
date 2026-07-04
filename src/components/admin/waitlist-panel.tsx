"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  WAITLIST_STATUSES,
  type WaitlistEntry,
  type WaitlistStatus,
} from "@/domain/entities/waitlist-entry";
import { getGenericMutationError } from "@/lib/security/input";
import { createClient } from "@/lib/supabase/client";

type WaitlistPanelProps = {
  initialEntries: WaitlistEntry[];
};

const STATUS_STYLES: Record<WaitlistStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  invited:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  converted:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatStatus(status: WaitlistStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function WaitlistPanel({ initialEntries }: WaitlistPanelProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const sources = Array.from(
    new Set(entries.map((entry) => entry.source).filter(Boolean))
  ).sort() as string[];
  const visibleEntries = entries.filter((entry) => {
    const statusMatches = statusFilter === "all" || entry.status === statusFilter;
    const sourceMatches = sourceFilter === "all" || entry.source === sourceFilter;
    return statusMatches && sourceMatches;
  });

  async function handleStatusChange(entryId: string, status: WaitlistStatus) {
    setError(null);
    setUpdatingId(entryId);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("waitlist_entries")
      .update({ status })
      .eq("id", entryId);

    setUpdatingId(null);

    if (updateError) {
      setError(getGenericMutationError(updateError.message));
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, status } : entry
      )
    );
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Recent waitlist entries
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Qualify new signups and keep their funnel status current.
            </p>
          </div>
          <span className="w-fit rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {visibleEntries.length} / {entries.length} shown
          </span>
        </div>
      </div>

      <div className="p-5">
        {error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as WaitlistStatus | "all")
              }
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="all">All statuses</option>
              {WAITLIST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Source
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="all">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              No waitlist entries yet.
            </p>
            <p className="mt-1 leading-6 text-zinc-500">
              New public signup submissions will appear here for review and
              invite tracking.
            </p>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              No entries match these filters.
            </p>
            <p className="mt-1 leading-6 text-zinc-500">
              Clear a filter to return to the full waitlist.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 pb-3 font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    Lead
                  </th>
                  <th className="border-b border-zinc-200 pb-3 font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    Source
                  </th>
                  <th className="border-b border-zinc-200 pb-3 font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    Added
                  </th>
                  <th className="border-b border-zinc-200 pb-3 font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/70 dark:border-zinc-900 dark:hover:bg-zinc-900/40"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold uppercase text-white dark:bg-zinc-50 dark:text-zinc-950">
                          {(entry.name ?? entry.email).slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                            {entry.email}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {entry.name ?? "No name captured"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-zinc-600 dark:text-zinc-400">
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                        {entry.source ?? "-"}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-mono text-xs text-zinc-500">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`hidden rounded-full border px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${STATUS_STYLES[entry.status]}`}
                        >
                          {formatStatus(entry.status)}
                        </span>
                        <select
                          value={entry.status}
                          disabled={updatingId === entry.id}
                          aria-label={`Update status for ${entry.email}`}
                          onChange={(event) =>
                            handleStatusChange(
                              entry.id,
                              event.target.value as WaitlistStatus
                            )
                          }
                          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm shadow-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {WAITLIST_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
