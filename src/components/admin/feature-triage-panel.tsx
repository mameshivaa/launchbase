"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FeatureRequest } from "@/domain/entities/feature-request";
import { getGenericMutationError } from "@/lib/security/input";
import { createClient } from "@/lib/supabase/client";

const FEATURE_STATUSES = [
  "open",
  "planned",
  "in_progress",
  "shipped",
  "closed",
] as const;

type FeatureStatus = FeatureRequest["status"];

const STATUS_LABELS: Record<FeatureStatus, string> = {
  open: "Open",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  closed: "Closed",
};

type FeatureTriagePanelProps = {
  initialFeatures: FeatureRequest[];
  voteCounts: Record<string, number>;
};

export function FeatureTriagePanel({
  initialFeatures,
  voteCounts,
}: FeatureTriagePanelProps) {
  const router = useRouter();
  const [features, setFeatures] = useState(initialFeatures);
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sortedFeatures = useMemo(
    () =>
      [...features]
        .filter((feature) => statusFilter === "all" || feature.status === statusFilter)
        .sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0)),
    [features, statusFilter, voteCounts]
  );

  async function updateStatus(featureId: string, status: FeatureStatus) {
    setError(null);
    setUpdatingId(featureId);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("feature_requests")
      .update({ status })
      .eq("id", featureId);

    setUpdatingId(null);

    if (updateError) {
      setError(getGenericMutationError(updateError.message));
      return;
    }

    setFeatures((current) =>
      current.map((feature) =>
        feature.id === featureId ? { ...feature, status } : feature
      )
    );
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Feature request triage
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Review demand and move requests into the right planning state.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as FeatureStatus | "all")
            }
            className="w-fit rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">All statuses</option>
            {FEATURE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5">
        {error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {sortedFeatures.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              No feature requests to triage.
            </p>
            <p className="mt-1 leading-6 text-zinc-500">
              Public requests will appear here after signed-in users submit
              them.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sortedFeatures.map((feature) => (
              <li
                key={feature.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {feature.title}
                      </p>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900">
                        {voteCounts[feature.id] ?? 0} votes
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {feature.submitter_email ?? "Signed-in user"}
                    </p>
                    {feature.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {feature.description}
                      </p>
                    ) : null}
                  </div>
                  <select
                    value={feature.status}
                    disabled={updatingId === feature.id}
                    onChange={(event) =>
                      updateStatus(feature.id, event.target.value as FeatureStatus)
                    }
                    aria-label={`Update status for ${feature.title}`}
                    className="w-fit rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm shadow-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {FEATURE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
