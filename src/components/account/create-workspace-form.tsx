"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getGenericMutationError,
  getRequiredTextError,
  INPUT_LIMITS,
  isValidSlug,
  normalizeSingleLineForValidation,
} from "@/lib/security/input";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function getWorkspaceError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "That slug is already taken. Choose a different workspace URL.";
  }

  if (lower.includes("slug")) {
    return "Use 3-63 lowercase letters, numbers, or hyphens for the slug.";
  }

  return getGenericMutationError(message);
}

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [customSlug, setCustomSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveSlug = useMemo(
    () => slugify(customSlug ? slug : name),
    [customSlug, name, slug]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedName = normalizeSingleLineForValidation(name);
    const nameError = getRequiredTextError(
      "Workspace name",
      normalizedName,
      INPUT_LIMITS.shortText
    );
    if (nameError) {
      setError(nameError);
      return;
    }

    if (!isValidSlug(effectiveSlug)) {
      setError("Use 3-63 lowercase letters, numbers, or hyphens for the slug.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_organization", {
      org_name: normalizedName,
      org_slug: effectiveSlug,
    });

    setLoading(false);

    if (rpcError) {
      setError(getWorkspaceError(rpcError.message));
      return;
    }

    const created = Array.isArray(data) ? data[0] : data;
    const createdSlug = created?.slug ?? effectiveSlug;

    router.push(`/${createdSlug}/admin`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#299764]">
          Create workspace
        </p>
        <h2 className="mt-2 text-base font-semibold tracking-tight">
          Start your launch operating dashboard
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Create an organization and become its owner automatically. No
          bootstrap SQL required.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="workspace-name" className="text-sm font-medium">
            Workspace name
          </label>
          <input
            id="workspace-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!customSlug) setSlug(slugify(event.target.value));
            }}
            className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Acme Launch"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="workspace-slug" className="text-sm font-medium">
            Public slug
          </label>
          <div className="flex rounded-lg border border-zinc-300 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-zinc-700">
            <span className="flex items-center border-r border-zinc-200 px-3 font-mono text-xs text-zinc-500 dark:border-zinc-800">
              /
            </span>
            <input
              id="workspace-slug"
              value={customSlug ? slug : effectiveSlug}
              onChange={(event) => {
                setCustomSlug(true);
                setSlug(slugify(event.target.value));
              }}
              className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 py-2.5 font-mono text-sm outline-none"
              placeholder="acme-launch"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#3ecf8e] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-[#34b978] disabled:opacity-50"
        >
          {loading ? "Creating workspace..." : "Create workspace"}
        </button>
      </div>
    </form>
  );
}
