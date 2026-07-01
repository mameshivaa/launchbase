"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  WAITLIST_STATUSES,
  type WaitlistEntry,
  type WaitlistStatus,
} from "@/domain/entities/waitlist-entry";
import { createClient } from "@/lib/supabase/client";

type WaitlistPanelProps = {
  initialEntries: WaitlistEntry[];
};

export function WaitlistPanel({ initialEntries }: WaitlistPanelProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      setError(updateError.message);
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
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Waitlist</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Admin-only view of signups. Update status as people move through the
          funnel.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No waitlist entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-3 py-2">{entry.email}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {entry.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {entry.source ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.status}
                      disabled={updatingId === entry.id}
                      onChange={(event) =>
                        handleStatusChange(
                          entry.id,
                          event.target.value as WaitlistStatus
                        )
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {WAITLIST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
