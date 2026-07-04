"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionHeader } from "@/components/public/section-header";
import { StatusBadge } from "@/components/public/status-badge";
import type { FeatureRequest } from "@/domain/entities/feature-request";
import {
  getGenericMutationError,
  getOptionalTextError,
  getRequiredTextError,
  INPUT_LIMITS,
  normalizeMultilineForValidation,
  normalizeSingleLineForValidation,
} from "@/lib/security/input";
import { createClient } from "@/lib/supabase/client";

type FeatureRequestsSectionProps = {
  organizationId: string;
  slug: string;
  initialFeatures: FeatureRequest[];
  initialVoteCounts: Record<string, number>;
  initialUserVotedIds: string[];
  userId: string | null;
};

function LoginPrompt({ slug, action }: { slug: string; action: string }) {
  const loginHref = `/login?next=/${slug}`;

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      <Link
        href={loginHref}
        className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
      >
        Log in
      </Link>{" "}
      to {action}.
    </p>
  );
}

function UpvoteButton({
  count,
  hasVoted,
  loading,
  disabled,
  onClick,
}: {
  count: number;
  hasVoted: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={hasVoted}
      aria-label={hasVoted ? "Remove upvote" : "Upvote"}
      className={`group flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border px-2 py-2.5 transition-colors disabled:opacity-50 ${
        hasVoted
          ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
      }`}
    >
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={`h-4 w-4 transition-transform ${hasVoted ? "scale-110" : "group-hover:-translate-y-0.5"}`}
        aria-hidden
      >
        <path d="M8 3.5 3.5 9h9L8 3.5Z" />
      </svg>
      <span className="mt-0.5 text-lg font-semibold tabular-nums leading-none">
        {loading ? "…" : count}
      </span>
    </button>
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

    const normalizedTitle = normalizeSingleLineForValidation(title);
    const normalizedDescription = normalizeMultilineForValidation(description);
    const titleError = getRequiredTextError(
      "Title",
      normalizedTitle,
      INPUT_LIMITS.title
    );
    const descriptionError = getOptionalTextError(
      "Description",
      normalizedDescription,
      INPUT_LIMITS.description
    );

    if (titleError || descriptionError) {
      setSubmitError(titleError ?? descriptionError);
      return;
    }

    setSubmitLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("feature_requests")
      .insert({
        organization_id: organizationId,
        title: normalizedTitle,
        description: normalizedDescription || null,
        created_by: userId,
      })
      .select(
        "id, organization_id, title, description, status, created_by, submitter_email, created_at, updated_at"
      )
      .single();

    setSubmitLoading(false);

    if (error) {
      setSubmitError(getGenericMutationError(error.message));
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
      setVoteError(getGenericMutationError(error.message));
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
    <section className="flex flex-col gap-5">
      <SectionHeader
        id="feature-requests"
        title="Feature requests"
        description="Community-submitted ideas. Signed-in users can submit and upvote."
      />

      {isLoggedIn ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Submit a feature request
          </h3>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="feature-title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="feature-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="What would you like to see?"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="feature-description"
                className="text-sm font-medium"
              >
                Description (optional)
              </label>
              <textarea
                id="feature-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Why is this useful?"
              />
            </div>
            {submitError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Feature request submitted.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitLoading}
              className="w-fit rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {submitLoading ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/30">
          <LoginPrompt slug={slug} action="submit a feature request" />
        </div>
      )}

      {voteError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
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
            const isVoteLoading = voteLoadingId === item.id;

            return (
              <li
                key={item.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex gap-4">
                  {isLoggedIn ? (
                    <UpvoteButton
                      count={count}
                      hasVoted={hasVoted}
                      loading={isVoteLoading}
                      disabled={isVoteLoading}
                      onClick={() => handleVoteToggle(item.id)}
                    />
                  ) : (
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 text-zinc-400"
                        aria-hidden
                      >
                        <path d="M8 3.5 3.5 9h9L8 3.5Z" />
                      </svg>
                      <span className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-zinc-900 dark:text-zinc-100">
                        {count}
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </h3>
                      <StatusBadge status={item.status} size="md" />
                    </div>
                    {item.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                    {!isLoggedIn ? (
                      <div className="mt-3">
                        <LoginPrompt slug={slug} action="vote" />
                      </div>
                    ) : null}
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
