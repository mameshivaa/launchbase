"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AcceptInvitationPanelProps = {
  token: string;
  email: string;
};

function getInviteAcceptError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("not found")) {
    return "This invitation link is invalid or has been replaced.";
  }

  if (lower.includes("expired")) {
    return "This invitation has expired. Ask an admin for a new link.";
  }

  if (lower.includes("email") || lower.includes("match")) {
    return "This invitation is for a different email address.";
  }

  if (lower.includes("pending")) {
    return "This invitation is no longer pending.";
  }

  return message;
}

export function AcceptInvitationPanel({
  token,
  email,
}: AcceptInvitationPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function acceptInvitation() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "accept_organization_invitation",
      { raw_token: token }
    );

    setLoading(false);

    if (rpcError) {
      setError(getInviteAcceptError(rpcError.message));
      return;
    }

    const accepted = Array.isArray(data) ? data[0] : data;
    const slug = accepted?.organization_slug;
    router.push(slug ? `/${slug}/admin` : "/account");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#299764]">
        Team invitation
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Join this LaunchBase workspace
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        You are signed in as <span className="font-medium">{email}</span>. The
        invite will only work when this email matches the invited address.
      </p>

      {error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={acceptInvitation}
          className="rounded-xl bg-[#3ecf8e] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-[#34b978] disabled:opacity-50"
        >
          {loading ? "Accepting..." : "Accept invitation"}
        </button>
        <Link
          href="/account"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Back to account
        </Link>
      </div>
    </section>
  );
}
