"use client";

import { useState } from "react";
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

  return message;
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

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("waitlist_entries").insert({
      organization_id: organizationId,
      email: trimmedEmail,
      name: name.trim() || null,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="waitlist-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="you@example.invalid"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="waitlist-name" className="text-sm font-medium">
          Name (optional)
        </label>
        <input
          id="waitlist-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Your name"
        />
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          You&apos;re on the waitlist. Thanks for signing up!
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Joining…" : "Join waitlist"}
      </button>
    </form>
  );
}
