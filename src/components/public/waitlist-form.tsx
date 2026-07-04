"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/public/section-header";
import {
  getGenericMutationError,
  getOptionalTextError,
  INPUT_LIMITS,
  isValidEmail,
  normalizeEmail,
  normalizeSingleLineForValidation,
} from "@/lib/security/input";
import { createClient } from "@/lib/supabase/client";

const WAITLIST_SOURCE_PUBLIC_PAGE = "public_page";

type WaitlistFormProps = {
  organizationId: string;
};

function getWaitlistError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "This email is already on the waitlist.";
  }

  return getGenericMutationError(message);
}

export function WaitlistForm({ organizationId }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeSingleLineForValidation(name);

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const nameError = getOptionalTextError(
      "Name",
      normalizedName,
      INPUT_LIMITS.shortText
    );
    if (nameError) {
      setError(nameError);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("waitlist_entries").insert({
      organization_id: organizationId,
      email: normalizedEmail,
      name: normalizedName || null,
      source: WAITLIST_SOURCE_PUBLIC_PAGE,
    });

    setLoading(false);

    if (insertError) {
      setError(getWaitlistError(insertError.message));
      return;
    }

    setSuccess(true);
    setEmail("");
    setName("");
  }

  return (
    <section className="flex flex-col gap-5">
      <SectionHeader
        id="waitlist"
        title="Join the waitlist"
        description="Get early access when we launch. No account required."
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="waitlist-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="waitlist-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="waitlist-name" className="text-sm font-medium">
                Name (optional)
              </label>
              <input
                id="waitlist-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Your name"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {loading ? "Joining…" : "Join waitlist"}
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              You&apos;re on the waitlist. Thanks for signing up!
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
