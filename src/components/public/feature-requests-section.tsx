"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FeatureRequest } from "@/domain/entities/feature-request";
import { createClient } from "@/lib/supabase/client";

type FeatureRequestsSectionProps = {
  organizationId: string;
  slug: string;
  initialFeatures: FeatureRequest[];
  initialVoteCounts: Record<string, number>;
  initialUserVotedIds: string[];
  userId: string | null;
};

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {label.replace("_", " ")}
    </span>
  );
}

function LoginPrompt({ slug, action }: { slug: string; action: string }) {
  const loginHref = `/login?next=/${slug}`;

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      <Link href={loginHref} className="font-medium underline">
        Log in
      </Link>{" "}
      to {action}.
    </p>
  );
}

export function FeatureRequestsSection({
  organizationId,
  slug,
  initialFeatures,
  initialVoteCounts,
  initialUserVotedIds,
  userId,
}: FeatureRequestsSectionProps) {
  const router = useRouter();
  const [features, setFeatures] = useState(initialFeatures);
  const [voteCounts, setVoteCounts] = useState(initialVoteCounts);
  const [userVotedIds, setUserVotedIds] = useState(
    () => new Set(initialUserVotedIds)
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const isLoggedIn = userId !== null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSubmitError(null);
    setSubmitSuccess(false);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSubmitError("Title is required.");
      return;
    }

    setSubmitLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("feature_requests")
      .insert({
        organization_id: organizationId,
        title: trimmedTitle,
        description: description.trim() || null,
        created_by: userId,
      })
      .select(
        "id, organization_id, title, description, status, created_by, submitter_email, created_at, updated_at"
      )
      .single();

    setSubmitLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    if (data) {
      setFeatures((current) => [data as FeatureRequest, ...current]);
      setVoteCounts((current) => ({ ...current, [data.id]: 0 }));
    }

    setSubmitSuccess(true);
    setTitle("");
    setDescription("");
    router.refresh();
  }

  async function handleVoteToggle(featureRequestId: string) {
    if (!userId) return;

    setVoteError(null);
    setVoteLoadingId(featureRequestId);

    const supabase = createClient();
    const hasVoted = userVotedIds.has(featureRequestId);

    const { error } = hasVoted
      ? await supabase
          .from("feature_votes")
          .delete()
          .eq("feature_request_id", featureRequestId)
          .eq("user_id", userId)
      : await supabase.from("feature_votes").insert({
          feature_request_id: featureRequestId,
          user_id: userId,
        });

    setVoteLoadingId(null);

    if (error) {
      setVoteError(error.message);
      return;
    }

    setUserVotedIds((current) => {
      const next = new Set(current);
      if (hasVoted) {
        next.delete(featureRequestId);
      } else {
        next.add(featureRequestId);
      }
      return next;
    });

    setVoteCounts((current) => ({
      ...current,
      [featureRequestId]: Math.max(
        0,
        (current[featureRequestId] ?? 0) + (hasVoted ? -1 : 1)
      ),
    }));

    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Feature requests</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Community-submitted ideas. Signed-in users can submit and upvote.
        </p>
      </div>

      {isLoggedIn ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h3 className="text-sm font-medium">Submit a feature request</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="feature-title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="feature-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="What would you like to see?"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="feature-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <textarea
                id="feature-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Why is this useful?"
              />
            </div>
            {submitError ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                Feature request submitted.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitLoading}
              className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {submitLoading ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <LoginPrompt slug={slug} action="submit a feature request" />
        </div>
      )}

      {voteError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {voteError}
        </p>
      ) : null}

      {features.length === 0 ? (
        <p className="text-sm text-zinc-500">No feature requests yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {features.map((item) => {
            const count = voteCounts[item.id] ?? 0;
            const hasVoted = userVotedIds.has(item.id);

            return (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-semibold tabular-nums">
                      {count}
                    </span>
                    <span className="text-xs text-zinc-500">votes</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <StatusBadge label={item.status} />
                    </div>
                    {item.description ? (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      {isLoggedIn ? (
                        <button
                          type="button"
                          disabled={voteLoadingId === item.id}
                          onClick={() => handleVoteToggle(item.id)}
                          className={`rounded-md border px-3 py-1 text-sm disabled:opacity-50 ${
                            hasVoted
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          {voteLoadingId === item.id
                            ? "…"
                            : hasVoted
                              ? "Upvoted"
                              : "Upvote"}
                        </button>
                      ) : (
                        <LoginPrompt slug={slug} action="vote" />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
