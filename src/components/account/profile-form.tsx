"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Profile } from "@/domain/entities/profile";
import {
  getGenericMutationError,
  getOptionalTextError,
  INPUT_LIMITS,
  normalizeSingleLineForValidation,
} from "@/lib/security/input";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  email: string;
  initialProfile: Profile | null;
  profileError: string | null;
};

export function ProfileForm({
  email,
  initialProfile,
  profileError,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(profileError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initialProfile) return;

    setError(null);
    setMessage(null);
    setLoading(true);

    const normalizedDisplayName =
      normalizeSingleLineForValidation(displayName);
    const displayNameError = getOptionalTextError(
      "Display name",
      normalizedDisplayName,
      INPUT_LIMITS.shortText
    );
    if (displayNameError) {
      setError(displayNameError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: normalizedDisplayName || null })
      .eq("id", initialProfile.id);

    setLoading(false);

    if (updateError) {
      setError(getGenericMutationError(updateError.message));
      return;
    }

    setMessage("Profile updated.");
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500">Signed in as</h2>
        <p className="mt-1 text-base">{email}</p>
      </section>

      {initialProfile ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Your name"
            />
          </div>

          <dl className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">Profile ID</dt>
              <dd className="font-mono text-xs break-all">{initialProfile.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900 dark:text-zinc-100">Created</dt>
              <dd>{new Date(initialProfile.created_at).toLocaleString()}</dd>
            </div>
          </dl>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {error ??
            "No profile row found. The handle_new_user trigger should create one on signup."}
        </p>
      )}
    </div>
  );
}
